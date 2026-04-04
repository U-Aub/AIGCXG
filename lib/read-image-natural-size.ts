/** 读取 data URL / 图片 URL 的像素尺寸（浏览器端） */
export function readImageNaturalSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () =>
      resolve({ width: Math.max(1, img.naturalWidth), height: Math.max(1, img.naturalHeight) })
    img.onerror = () => reject(new Error("无法读取图片尺寸"))
    img.src = dataUrl
  })
}
