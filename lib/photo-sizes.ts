import type { PhotoSize, PhotoSizeKey, LayoutConfig } from "./photo-types"

// 证件照尺寸配置（300dpi）
export const PHOTO_SIZES: Record<PhotoSizeKey, PhotoSize> = {
  "1inch": {
    key: "1inch",
    name: "1寸",
    widthMm: 25,
    heightMm: 35,
    widthPx: 295,
    heightPx: 413,
  },
  "2inch": {
    key: "2inch",
    name: "2寸",
    widthMm: 35,
    heightMm: 49,
    widthPx: 413,
    heightPx: 579,
  },
  passport: {
    key: "passport",
    name: "护照",
    widthMm: 33,
    heightMm: 48,
    widthPx: 390,
    heightPx: 567,
  },
  marriageCert: {
    key: "marriageCert",
    name: "结婚证",
    widthMm: 53,
    heightMm: 35,
    widthPx: 626,
    heightPx: 413,
  },
  /** 占位比例；选中后实际比例由上传图像素决定 */
  originalAspect: {
    key: "originalAspect",
    name: "原尺寸",
    widthMm: 3,
    heightMm: 4,
    widthPx: 1,
    heightPx: 1,
  },
  custom: {
    key: "custom",
    name: "自定义",
    widthMm: 25,
    heightMm: 35,
    widthPx: 295,
    heightPx: 413,
  },
  a6: {
    key: "a6",
    name: "A6",
    widthMm: 105,
    heightMm: 148,
    widthPx: 1240,
    heightPx: 1748,
  },
  a4: {
    key: "a4",
    name: "A4",
    widthMm: 210,
    heightMm: 297,
    widthPx: 2480,
    heightPx: 3508,
  },
}

/** 证件照尺寸下拉顺序（自定义固定在最下方） */
export const PHOTO_SIZE_OPTIONS: PhotoSize[] = [
  PHOTO_SIZES["1inch"],
  PHOTO_SIZES["2inch"],
  PHOTO_SIZES.passport,
  PHOTO_SIZES.marriageCert,
  PHOTO_SIZES.a6,
  PHOTO_SIZES.a4,
  PHOTO_SIZES.originalAspect,
  PHOTO_SIZES.custom,
]

// A6纸张尺寸（300dpi）
export const A6_PAPER = {
  widthMm: 105,
  heightMm: 148,
  widthPx: 1240,
  heightPx: 1748,
}

// A6排版布局配置
export const LAYOUT_CONFIGS: Record<PhotoSizeKey, LayoutConfig> = {
  "1inch": {
    rows: 4,
    cols: 2,
    gapMm: 3,
    supported: true,
  },
  "2inch": {
    rows: 2,
    cols: 2,
    gapMm: 5,
    supported: true,
  },
  passport: {
    rows: 2,
    cols: 2,
    gapMm: 5,
    supported: true,
  },
  marriageCert: {
    rows: 3,
    cols: 1,
    gapMm: 4,
    supported: true,
  },
  originalAspect: {
    rows: 0,
    cols: 0,
    gapMm: 0,
    supported: false,
    message: "原尺寸与上传图比例一致，请使用单张下载",
  },
  custom: {
    rows: 1,
    cols: 1,
    gapMm: 4,
    supported: true,
  },
  a6: {
    rows: 1,
    cols: 1,
    gapMm: 0,
    supported: true,
  },
  a4: {
    rows: 0,
    cols: 0,
    gapMm: 0,
    supported: false,
    message: "A4尺寸过大，请使用单张下载",
  },
}

// 毫米转像素（300dpi）
export function mmToPx(mm: number): number {
  return Math.round((mm / 25.4) * 300)
}

/** Seedream 等对输出面积的下限（约 1920×1920） */
const OUTPUT_MIN_PIXEL_AREA = 3686400
/** 2K 档目标：长边约 2048，按比例放大直至满足面积下限 */
const OUTPUT_LONG_EDGE_TARGET = 2048

/**
 * 按证件照毫米尺寸的宽高比，计算 API/导出用的像素尺寸（2K 档位，满足最小面积）。
 * Seedream 等要求面积 ≥ 3686400；极端宽高比下仅用 round 会略低于下限，故用 ceil + 对齐偶数后再校验。
 */
export function computeOutputSizePixels(photoSize: PhotoSize): {
  width: number
  height: number
} {
  const rw = Math.max(1, photoSize.widthMm)
  const rh = Math.max(1, photoSize.heightMm)
  let w: number
  let h: number
  if (rw >= rh) {
    w = OUTPUT_LONG_EDGE_TARGET
    h = Math.max(1, Math.round((OUTPUT_LONG_EDGE_TARGET * rh) / rw))
  } else {
    h = OUTPUT_LONG_EDGE_TARGET
    w = Math.max(1, Math.round((OUTPUT_LONG_EDGE_TARGET * rw) / rh))
  }
  let area = w * h
  if (area < OUTPUT_MIN_PIXEL_AREA) {
    const scale = Math.sqrt(OUTPUT_MIN_PIXEL_AREA / area)
    w = Math.max(1, Math.ceil(w * scale))
    h = Math.max(1, Math.ceil(h * scale))
  }
  const toEven = (n: number) => (n % 2 === 0 ? n : n + 1)
  w = toEven(w)
  h = toEven(h)
  let guard = 0
  while (w * h < OUTPUT_MIN_PIXEL_AREA && guard < 24) {
    guard += 1
    const scale = Math.sqrt(OUTPUT_MIN_PIXEL_AREA / (w * h))
    w = toEven(Math.max(w, Math.ceil(w * scale)))
    h = toEven(Math.max(h, Math.ceil(h * scale)))
  }
  if (w * h < OUTPUT_MIN_PIXEL_AREA) {
    w = 1920
    h = 1920
  }
  return { width: w, height: h }
}

/**
 * 用上传图像素宽高比构造 PhotoSize（仅比例用于 2K 输出），用于旧照片等非证件照场景。
 */
export function photoSizeFromImagePixels(widthPx: number, heightPx: number): PhotoSize {
  const w = Math.max(1, Math.round(widthPx))
  const h = Math.max(1, Math.round(heightPx))
  return {
    key: "custom",
    name: "旧照片",
    widthMm: w,
    heightMm: h,
    widthPx: w,
    heightPx: h,
  }
}

/** 解析实际输出尺寸（含自定义毫米、原尺寸时的上传图像素比例） */
export function resolvePhotoSize(
  sizeKey: PhotoSizeKey,
  customMm: { width: number; height: number } | null,
  sourcePixels: { width: number; height: number } | null = null
): PhotoSize {
  if (
    sizeKey === "originalAspect" &&
    sourcePixels &&
    sourcePixels.width > 0 &&
    sourcePixels.height > 0
  ) {
    const base = photoSizeFromImagePixels(sourcePixels.width, sourcePixels.height)
    return {
      ...base,
      key: "originalAspect",
      name: "原尺寸（上传图比例）",
    }
  }
  if (
    sizeKey === "custom" &&
    customMm &&
    customMm.width > 0 &&
    customMm.height > 0 &&
    customMm.width <= 500 &&
    customMm.height <= 500
  ) {
    return {
      key: "custom",
      name: `自定义（${customMm.width}×${customMm.height}mm）`,
      widthMm: customMm.width,
      heightMm: customMm.height,
      widthPx: mmToPx(customMm.width),
      heightPx: mmToPx(customMm.height),
    }
  }
  return PHOTO_SIZES[sizeKey]
}
