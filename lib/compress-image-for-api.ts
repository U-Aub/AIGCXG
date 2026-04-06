/** 提交 Ark 前将图片压到上限以内：优先调 JPEG 质量，必要时再缩小分辨率。 */

export const API_SUBMIT_IMAGE_MAX_BYTES = 200 * 1024

const JPEG_MIME = "image/jpeg"
const MIN_QUALITY = 0.42
const MAX_QUALITY = 0.92
/** 与 /api/generate 校验一致 */
const MAX_EDGE_PX = 8192

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("图片加载失败"))
    img.src = dataUrl
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error("读取压缩结果失败"))
    r.readAsDataURL(blob)
  })
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), JPEG_MIME, quality)
  })
}

/**
 * 在当前画布分辨率下，用二分查找取不超过 maxBytes 的最高 JPEG 质量。
 * 若即使最低质量仍超限，返回 null。
 */
async function encodeCanvasUnderBudget(
  canvas: HTMLCanvasElement,
  maxBytes: number
): Promise<Blob | null> {
  let lowQ = MIN_QUALITY
  let highQ = MAX_QUALITY
  let best: Blob | null = null
  for (let i = 0; i < 14; i++) {
    const q = (lowQ + highQ) / 2
    const blob = await canvasToJpegBlob(canvas, q)
    if (!blob) return null
    if (blob.size <= maxBytes) {
      best = blob
      lowQ = q
    } else {
      highQ = q
    }
  }
  if (best) return best
  const last = await canvasToJpegBlob(canvas, MIN_QUALITY)
  if (last && last.size <= maxBytes) return last
  return null
}

function initialCanvasSize(
  naturalW: number,
  naturalH: number
): { w: number; h: number } {
  if (naturalW < 1 || naturalH < 1) {
    return { w: 1, h: 1 }
  }
  if (naturalW <= MAX_EDGE_PX && naturalH <= MAX_EDGE_PX) {
    return { w: naturalW, h: naturalH }
  }
  const r = Math.min(MAX_EDGE_PX / naturalW, MAX_EDGE_PX / naturalH)
  return {
    w: Math.max(1, Math.round(naturalW * r)),
    h: Math.max(1, Math.round(naturalH * r)),
  }
}

/**
 * 将 data URL 转为 JPEG data URL，二进制体积不超过 maxBytes。
 * 已小于上限时原样返回（不重复编码，避免无谓画质损失）。
 */
export async function compressDataUrlForApi(
  dataUrl: string,
  maxBytes: number = API_SUBMIT_IMAGE_MAX_BYTES
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(dataUrl)
  const rawBlob = await fetch(dataUrl).then((r) => r.blob())
  if (rawBlob.size <= maxBytes) {
    return {
      dataUrl,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
  }

  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("无法创建画布")
  }

  let { w, h } = initialCanvasSize(img.naturalWidth, img.naturalHeight)

  for (let attempt = 0; attempt < 28; attempt++) {
    canvas.width = w
    canvas.height = h
    ctx.drawImage(img, 0, 0, w, h)

    const blob = await encodeCanvasUnderBudget(canvas, maxBytes)
    if (blob) {
      return {
        dataUrl: await blobToDataUrl(blob),
        width: w,
        height: h,
      }
    }

    const worst = await canvasToJpegBlob(canvas, MIN_QUALITY)
    const sz = worst?.size ?? maxBytes + 1
    const factor = Math.min(0.92, Math.sqrt(maxBytes / sz) * 0.96)
    const nw = Math.max(1, Math.round(w * factor))
    const nh = Math.max(1, Math.round(h * factor))
    if (nw >= w && nh >= h) {
      w = Math.max(1, w - 1)
      h = Math.max(1, h - 1)
    } else {
      w = nw
      h = nh
    }
  }

  throw new Error("图片无法压缩到可用大小，请换一张稍小的图重试")
}

export async function compressDataUrlForApiOptional(
  dataUrl: string | null | undefined,
  maxBytes: number = API_SUBMIT_IMAGE_MAX_BYTES
): Promise<string | undefined> {
  if (!dataUrl) return undefined
  const { dataUrl: out } = await compressDataUrlForApi(dataUrl, maxBytes)
  return out
}
