/** 照片处理预计总时长（秒），用于处理中倒计时展示 */
export const ESTIMATED_PROCESSING_SECONDS = 120

/** 根据已进行秒数与预计总秒数，得到倒计时剩余秒数（不低于 0） */
export function remainingSecondsFromEstimate(
  elapsedSeconds: number,
  estimatedTotalSeconds: number = ESTIMATED_PROCESSING_SECONDS
): number {
  const e = Math.max(0, Math.floor(elapsedSeconds))
  return Math.max(0, estimatedTotalSeconds - e)
}

/** 格式化为「分:秒」用于处理中计时 */
export function formatElapsedClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
}

/** 格式化为中文总耗时（完成后展示） */
export function formatTotalDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0 秒"
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec} 秒`
  const m = Math.floor(sec / 60)
  const r = sec % 60
  if (r === 0) return `${m} 分钟`
  return `${m} 分 ${r} 秒`
}
