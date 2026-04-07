/** Vercel Serverless 请求体上限约 4.5MB，略留余量给 JSON 字段与编码 */
export const VERCEL_SAFE_JSON_BODY_BYTES = 4_300_000

export function assertJsonBodyWithinVercelLimit(serialized: string): void {
  const n = new Blob([serialized]).size
  if (n > VERCEL_SAFE_JSON_BODY_BYTES) {
    throw new Error(
      `上传数据过大（约 ${(n / 1e6).toFixed(1)}MB）。Vercel 等平台对单次请求约 4.5MB 上限，请换用更小的原图、或去掉服装/背景参考图后再试。`
    )
  }
}

export function friendlyBrowserFetchError(err: unknown): string {
  if (!(err instanceof Error)) return "未知错误"
  if (err.name === "AbortError") return "处理已取消"
  const m = err.message
  if (/Failed to fetch|Load failed|NetworkError|network error|fetch failed/i.test(m)) {
    return (
      "无法完成请求（浏览器未收到有效响应）。在 Vercel 上常见原因：① 免费版 Serverless 最长约 10 秒，" +
      "图片生成较慢时会被中断（需升级 Pro 等套餐以延长执行时间）；② 单次请求体超过约 4.5MB（多张大图/base64 易超限）；③ 临时网络问题。可尝试压缩图片、减少参考图，或在 Vercel 控制台查看该次部署的 Function 日志。"
    )
  }
  return m
}
