import type { HistoryRecord, HistoryRecordInput, ApiUsage } from "./photo-types"
import {
  putHistoryFullImage,
  getHistoryFullImage,
  deleteHistoryFullImage,
  clearHistoryFullImages,
} from "./history-full-image-db"

const HISTORY_KEY = "id-photo-history"
const USAGE_KEY = "id-photo-api-usage"
const MAX_HISTORY_ITEMS = 10

/** localStorage 内仅存小缩略图 + 元数据；完整图在 IndexedDB */
interface PersistedHistoryRecord {
  id: string
  createdAt: number
  thumbnailUrl: string
  kind?: HistoryRecord["kind"]
  sizeKey: HistoryRecord["sizeKey"]
  customWidthMm?: number
  customHeightMm?: number
  sourceWidthPx?: number
  sourceHeightPx?: number
  backgroundColorKey: HistoryRecord["backgroundColorKey"]
  /** 仅旧版数据；迁移后删除 */
  fullImageUrl?: string
}

function parsePersistedList(): PersistedHistoryRecord[] {
  if (typeof window === "undefined") return []
  try {
    const data = localStorage.getItem(HISTORY_KEY)
    if (!data) return []
    const parsed = JSON.parse(data) as unknown
    return Array.isArray(parsed) ? (parsed as PersistedHistoryRecord[]) : []
  } catch {
    return []
  }
}

function stripForStorage(list: PersistedHistoryRecord[]): Omit<PersistedHistoryRecord, "fullImageUrl">[] {
  return list.map(({ fullImageUrl: _drop, ...rest }) => rest)
}

function savePersistedList(history: PersistedHistoryRecord[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(stripForStorage(history)))
  } catch (e) {
    if (
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014)
    ) {
      shrinkPersistedUntilFits([...history])
      return
    }
    throw e
  }
}

/** 配额仍超则逐条删最旧并同步删 IDB，直到写入成功或清空 */
function shrinkPersistedUntilFits(history: PersistedHistoryRecord[]): void {
  const h = [...history]
  while (h.length > 0) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(stripForStorage(h)))
      return
    } catch {
      const removed = h.pop()
      if (removed?.id) void deleteHistoryFullImage(removed.id)
    }
  }
  try {
    localStorage.removeItem(HISTORY_KEY)
  } catch {
    /* ignore */
  }
}

function createThumbnailDataUrl(dataUrl: string, maxEdge = 280): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      let w = img.naturalWidth
      let h = img.naturalHeight
      const scale = Math.min(1, maxEdge / Math.max(w, h, 1))
      w = Math.max(1, Math.round(w * scale))
      h = Math.max(1, Math.round(h * scale))
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("canvas"))
        return
      }
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL("image/jpeg", 0.72))
    }
    img.onerror = () => reject(new Error("thumbnail load failed"))
    img.src = dataUrl
  })
}

function toHistoryRecord(p: PersistedHistoryRecord): HistoryRecord {
  const { fullImageUrl, ...rest } = p
  return {
    ...rest,
    ...(fullImageUrl ? { fullImageUrl } : {}),
  }
}

export function getHistory(): HistoryRecord[] {
  return parsePersistedList().map(toHistoryRecord)
}

/**
 * 将旧版存在 localStorage 里的大图迁入 IndexedDB 并改写为仅缩略图，释放配额。
 */
export async function migrateLegacyHistoryToIndexedDB(): Promise<void> {
  if (typeof window === "undefined") return
  const list = parsePersistedList()
  let changed = false
  const next: PersistedHistoryRecord[] = []

  for (const r of list) {
    const full = r.fullImageUrl
    const copy: PersistedHistoryRecord = { ...r }
    if (typeof full === "string" && full.length > 8000) {
      try {
        await putHistoryFullImage(copy.id, full)
        delete copy.fullImageUrl
        if (
          !copy.thumbnailUrl ||
          copy.thumbnailUrl === full ||
          copy.thumbnailUrl.length > 8000
        ) {
          copy.thumbnailUrl = await createThumbnailDataUrl(full)
        }
        changed = true
      } catch {
        // 迁入失败则尽量保留原数据，避免丢记录
      }
    }
    next.push(copy)
  }

  if (changed) {
    try {
      savePersistedList(next)
    } catch {
      /* shrinkPersistedUntilFits 已在 save 内处理 */
    }
  }
}

export async function addToHistory(input: HistoryRecordInput): Promise<HistoryRecord> {
  const history = parsePersistedList()
  const id = generateId()
  const createdAt = Date.now()
  const thumbnailUrl = await createThumbnailDataUrl(input.imageUrl)

  try {
    await putHistoryFullImage(id, input.imageUrl)
  } catch (e) {
    console.warn("[id-photo] IndexedDB 存完整图失败，历史下载可能不可用:", e)
  }

  const persisted: PersistedHistoryRecord = {
    id,
    createdAt,
    thumbnailUrl,
    sizeKey: input.sizeKey,
    backgroundColorKey: input.backgroundColorKey,
    ...(input.kind ? { kind: input.kind } : {}),
    ...(input.customWidthMm != null ? { customWidthMm: input.customWidthMm } : {}),
    ...(input.customHeightMm != null ? { customHeightMm: input.customHeightMm } : {}),
    ...(input.sourceWidthPx != null ? { sourceWidthPx: input.sourceWidthPx } : {}),
    ...(input.sourceHeightPx != null ? { sourceHeightPx: input.sourceHeightPx } : {}),
  }

  history.unshift(persisted)

  while (history.length > MAX_HISTORY_ITEMS) {
    const tail = history.pop()
    if (tail) void deleteHistoryFullImage(tail.id)
  }

  savePersistedList(history)

  return {
    ...persisted,
    fullImageUrl: input.imageUrl,
  }
}

export async function resolveHistoryFullImage(record: HistoryRecord): Promise<string | undefined> {
  if (record.fullImageUrl) return record.fullImageUrl
  return getHistoryFullImage(record.id)
}

export function removeFromHistory(id: string): void {
  const history = parsePersistedList().filter((item) => item.id !== id)
  savePersistedList(history)
  void deleteHistoryFullImage(id)
}

export async function clearHistory(): Promise<void> {
  localStorage.removeItem(HISTORY_KEY)
  await clearHistoryFullImages()
}

// API用量管理
export function getApiUsage(): ApiUsage {
  if (typeof window === "undefined") {
    return getDefaultUsage()
  }
  try {
    const data = localStorage.getItem(USAGE_KEY)
    if (!data) return getDefaultUsage()
    const usage = JSON.parse(data) as ApiUsage
    // 检查是否是当前月份
    const currentMonth = getCurrentMonth()
    if (usage.month !== currentMonth) {
      return getDefaultUsage()
    }
    return usage
  } catch {
    return getDefaultUsage()
  }
}

export function updateApiUsage(inputTokens: number, outputTokens: number): ApiUsage {
  const currentMonth = getCurrentMonth()
  const usage = getApiUsage()

  const newUsage: ApiUsage = {
    month: currentMonth,
    callCount: usage.month === currentMonth ? usage.callCount + 1 : 1,
    totalInputTokens:
      usage.month === currentMonth ? usage.totalInputTokens + inputTokens : inputTokens,
    totalOutputTokens:
      usage.month === currentMonth ? usage.totalOutputTokens + outputTokens : outputTokens,
  }

  localStorage.setItem(USAGE_KEY, JSON.stringify(newUsage))
  return newUsage
}

// 辅助函数
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getDefaultUsage(): ApiUsage {
  return {
    month: getCurrentMonth(),
    callCount: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  }
}

// 估算费用（基于OpenAI定价）
export function estimateCost(usage: ApiUsage): number {
  // GPT-4o pricing: $5/1M input tokens, $15/1M output tokens (approximate)
  const inputCost = (usage.totalInputTokens / 1_000_000) * 5
  const outputCost = (usage.totalOutputTokens / 1_000_000) * 15
  return inputCost + outputCost
}
