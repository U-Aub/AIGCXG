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
