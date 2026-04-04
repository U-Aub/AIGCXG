import type { PhotoSizeKey, PhotoSize } from "./photo-types"
import { LAYOUT_CONFIGS, A6_PAPER, mmToPx, computeOutputSizePixels } from "./photo-sizes"

export interface LayoutResult {
  success: boolean
  message?: string
  dataUrl?: string
}

// 生成A6排版图片
export async function generateA6Layout(
  imageUrl: string,
  sizeKey: PhotoSizeKey,
  photoSize: PhotoSize
): Promise<LayoutResult> {
  const layoutConfig = LAYOUT_CONFIGS[sizeKey]

  if (!layoutConfig.supported) {
    return {
      success: false,
      message: layoutConfig.message || "此尺寸不支持排版打印",
    }
  }

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = A6_PAPER.widthPx
      canvas.height = A6_PAPER.heightPx
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve({ success: false, message: "无法创建画布" })
        return
      }

      // 填充白色背景
      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const gapPx = mmToPx(layoutConfig.gapMm)
      const photoWidthPx = photoSize.widthPx
      const photoHeightPx = photoSize.heightPx

      // 计算总宽度和总高度
      const totalWidth = layoutConfig.cols * photoWidthPx + (layoutConfig.cols - 1) * gapPx
      const totalHeight = layoutConfig.rows * photoHeightPx + (layoutConfig.rows - 1) * gapPx

      // 计算起始位置（居中）
      const startX = Math.round((A6_PAPER.widthPx - totalWidth) / 2)
      const startY = Math.round((A6_PAPER.heightPx - totalHeight) / 2)

      // 绘制照片网格
      for (let row = 0; row < layoutConfig.rows; row++) {
        for (let col = 0; col < layoutConfig.cols; col++) {
          const x = startX + col * (photoWidthPx + gapPx)
          const y = startY + row * (photoHeightPx + gapPx)
          ctx.drawImage(img, x, y, photoWidthPx, photoHeightPx)
        }
      }

      const dataUrl = canvas.toDataURL("image/jpeg", 0.95)
      resolve({ success: true, dataUrl })
    }

    img.onerror = () => {
      resolve({ success: false, message: "图片加载失败" })
    }

    img.src = imageUrl
  })
}

// 生成单张下载图片
export async function generateSinglePhoto(
  imageUrl: string,
  photoSize: PhotoSize
): Promise<LayoutResult> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      const { width: cw, height: ch } = computeOutputSizePixels(photoSize)
      const canvas = document.createElement("canvas")
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve({ success: false, message: "无法创建画布" })
        return
      }

      ctx.fillStyle = "#FFFFFF"
      ctx.fillRect(0, 0, cw, ch)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = "high"
      const iw = img.naturalWidth
      const ih = img.naturalHeight
      const scale = Math.min(cw / iw, ch / ih)
      const dw = iw * scale
      const dh = ih * scale
      const ox = (cw - dw) / 2
      const oy = (ch - dh) / 2
      ctx.drawImage(img, ox, oy, dw, dh)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.98)
      resolve({ success: true, dataUrl })
    }

    img.onerror = () => {
      resolve({ success: false, message: "图片加载失败" })
    }

    img.src = imageUrl
  })
}

// 触发下载
export function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement("a")
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 生成文件名
export function generateFilename(
  photoSize: PhotoSize,
  backgroundColorKey: string,
  isLayout: boolean = false,
  filePrefix: string = "证件照"
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const safeName = photoSize.name.replace(/[×/\\?%*:|"<>]/g, "x")
  const suffix = isLayout ? "_A6排版" : ""
  return `${filePrefix}_${safeName}_${backgroundColorKey}${suffix}_${timestamp}.jpg`
}
