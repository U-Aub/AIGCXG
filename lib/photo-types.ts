// 证件照尺寸类型
export type PhotoSizeKey =
  | "1inch"
  | "2inch"
  | "passport"
  | "marriageCert"
  | "originalAspect"
  | "custom"
  | "a6"
  | "a4"

export interface PhotoSize {
  key: PhotoSizeKey
  name: string
  widthMm: number
  heightMm: number
  widthPx: number
  heightPx: number
}

// 背景色类型
export type BackgroundColorKey = "red" | "white" | "blue"

export interface BackgroundColor {
  key: BackgroundColorKey
  name: string
  hex: string
  rgb: { r: number; g: number; b: number }
}

// 生成请求
export interface GenerateRequest {
  image: string // base64
  clothingImage?: string // base64 服装参考图
  /** 自定义背景参考图（与纯色背景二选一优先使用参考图） */
  backgroundReferenceImage?: string
  sizeKey: PhotoSizeKey
  /** sizeKey 为 custom 时必填，单位 mm */
  customWidthMm?: number
  customHeightMm?: number
  backgroundColorKey: BackgroundColorKey
  customPrompt?: string
  /** sizeKey 为 originalAspect 时必填：上传图宽高像素，用于输出比例与 2K size */
  sourceWidth?: number
  sourceHeight?: number
  /** 浏览器「我的」中保存的密钥；缺省时用服务端环境变量 */
  arkApiKey?: string
  arkModel?: string
}

// 生成响应
export interface GenerateResponse {
  imageUrl: string
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

/** 旧照片修复（与证件照共用 /api/generate，通过 mode 区分） */
export interface VintageRestoreRequest {
  mode: "vintage"
  image: string
  prompt: string
  /** 与上传图一致，用于 2K 输出保持宽高比 */
  sourceWidth: number
  sourceHeight: number
  arkApiKey?: string
  arkModel?: string
}

export type AppMainTab = "idPhoto" | "vintage"

export type HistoryRecordKind = "idPhoto" | "vintage"

// 历史记录（完整图默认存 IndexedDB，见 history-storage / history-full-image-db）
export interface HistoryRecord {
  id: string
  thumbnailUrl: string // 列表展示用小缩略图（localStorage）
  /** 下载用大图；新数据在 IndexedDB，需 getHistoryFullImage(id) 或迁移前可能仍在内存/旧 JSON */
  fullImageUrl?: string
  /** 未写则视为证件照历史 */
  kind?: HistoryRecordKind
  sizeKey: PhotoSizeKey
  /** 自定义尺寸时用于展示 */
  customWidthMm?: number
  customHeightMm?: number
  /** 原尺寸 / 旧照修复：下载与展示比例 */
  sourceWidthPx?: number
  sourceHeightPx?: number
  backgroundColorKey: BackgroundColorKey
  createdAt: number // timestamp
}

/** 写入历史时只需传一张结果图 */
export interface HistoryRecordInput {
  imageUrl: string
  kind?: HistoryRecordKind
  sizeKey: PhotoSizeKey
  customWidthMm?: number
  customHeightMm?: number
  sourceWidthPx?: number
  sourceHeightPx?: number
  backgroundColorKey: BackgroundColorKey
}

// API用量统计
export interface ApiUsage {
  month: string // YYYY-MM
  callCount: number
  totalInputTokens: number
  totalOutputTokens: number
}

// 排版布局配置
export interface LayoutConfig {
  rows: number
  cols: number
  gapMm: number
  supported: boolean
  message?: string
}
