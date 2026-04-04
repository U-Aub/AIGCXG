import type { BackgroundColorKey, PhotoSizeKey } from "./photo-types"
import { BACKGROUND_COLORS } from "./background-colors"
import { resolvePhotoSize, computeOutputSizePixels } from "./photo-sizes"

export interface GeneratePromptOptions {
  hasClothingImage?: boolean
  hasBackgroundReference?: boolean
  customWidthMm?: number
  customHeightMm?: number
  /** 原尺寸：上传图像素宽高，用于比例与输出说明 */
  sourcePixelWidth?: number
  sourcePixelHeight?: number
}

// 默认提示词模板（输出规格与接口 size 像素、毫米比例一致）
export const DEFAULT_PROMPT_TEMPLATE = `请将此照片处理成标准{{sizeName}}证件照：{{inputOrderNote}}{{orientationNote}}
1. 抠图与背景合成（须严格分步执行）：
   - 第一步：对第一张人像照片进行精准抠图，使人像主体与原始拍摄背景完全分离；边缘干净（含发丝、耳廓、衣领），无白边、灰边、原环境色晕与场景漏底。
   - 第二步：在抠图完成后再做背景合成——将分离出的人像叠放到下方指定的背景上；除人像外，画面须仅为该背景，不得残留原图墙面、家具、地面、杂物等任何原场景。
   - 背景最终效果：纯色须均匀无渐变条带与脏斑；参考图背景须整体干净、与参考一致或简化后仍显纯净。
   - 具体要求：{{backgroundInstruction}}
2. 人像处理：
  - 人像皮肤白皙，不发黄、不暗沉
  - 亚洲肤色统一处理成均匀透亮的牛奶肌，红润有光泽
  - 磨皮轻度：保留毛孔、五官纹理
  - 明暗过渡柔和，面部无明显色块
  - 祛痘、祛黑眼圈、祛法令纹
  - 眼睛明亮有神，眼神自然
  - 统一发色，去杂色、去毛躁反光
  - 避免暖黄老旧感
3. 构图要求：
   - 头部居中，占画面约3/5
   - 肩部自然呈现
   - 表情自然端正
4. 输出规格：{{outputSpec}}
{{clothingNote}}`

function buildOrientationNote(widthMm: number, heightMm: number): string {
  if (widthMm > heightMm) {
    return "【画幅方向】最终成图必须为横版（宽>高），与所选毫米比例一致；若用户上传竖拍照片，仍须输出横版画幅（可裁切或重构图），禁止输出竖版整张图。\n"
  }
  if (heightMm > widthMm) {
    return "【画幅方向】最终成图必须为竖版（高>宽），与所选毫米比例一致；若用户上传横拍照片，仍须输出竖版画幅（可裁切或重构图），禁止仅因输入横图而输出横版。\n"
  }
  return "【画幅方向】最终成图必须为正方形（宽高相等），与所选毫米尺寸一致。\n"
}

function buildInputOrderNote(
  hasClothingImage: boolean,
  hasBackgroundReference: boolean
): string {
  if (hasClothingImage && hasBackgroundReference) {
    return "\n【输入图顺序】第一张：人像照片；第二张：服装参考图；第三张：背景参考图。\n"
  }
  if (hasClothingImage) {
    return "\n【输入图顺序】第一张：人像照片；第二张：服装参考图。\n"
  }
  if (hasBackgroundReference) {
    return "\n【输入图顺序】第一张：人像照片；第二张：背景参考图。\n"
  }
  return "\n"
}

function buildBackgroundInstruction(
  backgroundColorKey: BackgroundColorKey,
  hasBackgroundReference: boolean
): string {
  if (hasBackgroundReference) {
    return "第二步合成时请参考最后一张背景参考图：除人像外的区域在色调、氛围与图案等方面与该图一致或相近；可适当简化以符合证件照规范，但须保持背景干净、无原生活照场景混入。"
  }
  const bgColor = BACKGROUND_COLORS[backgroundColorKey]
  return `第二步合成时使用均匀纯色${bgColor.name}背景（${bgColor.hex}），全画布除人像外须为该色、无色差渐变与噪点脏斑。`
}

function buildClothingNote(
  hasClothingImage: boolean,
  hasBackgroundReference: boolean
): string {
  if (!hasClothingImage) return ""
  if (hasBackgroundReference) {
    return "5. 服装：请参考第二张服装参考图，将第一张人像的衣着替换为与参考图一致或相近的款式、颜色与风格；抠图与背景合成以第 1 条为准。保持面部与姿态自然。"
  }
  return "5. 服装：第二张输入为服装参考图。请将人像照片中的衣着替换为与参考图一致或相近的款式、颜色与风格，保持面部与姿态自然。"
}

// 生成完整提示词
export function generatePrompt(
  sizeKey: PhotoSizeKey,
  backgroundColorKey: BackgroundColorKey,
  options: GeneratePromptOptions = {},
  customPrompt?: string
): string {
  if (customPrompt) {
    return customPrompt
  }

  const hasClothingImage = options.hasClothingImage ?? false
  const hasBackgroundReference = options.hasBackgroundReference ?? false

  const customMm =
    sizeKey === "custom" &&
    options.customWidthMm != null &&
    options.customHeightMm != null
      ? { width: options.customWidthMm, height: options.customHeightMm }
      : null

  const sourcePixels =
    sizeKey === "originalAspect" &&
    options.sourcePixelWidth != null &&
    options.sourcePixelHeight != null
      ? { width: options.sourcePixelWidth, height: options.sourcePixelHeight }
      : null

  const size = resolvePhotoSize(sizeKey, customMm, sourcePixels)
  const outPx = computeOutputSizePixels(size)
  const orientationNote = buildOrientationNote(size.widthMm, size.heightMm)
  const outputSpec =
    sizeKey === "originalAspect" && sourcePixels
      ? `2K 高清约 ${outPx.width}×${outPx.height} 像素，画幅宽高比必须与上传原图一致（参考像素比例 ${sourcePixels.width}×${sourcePixels.height}），勿改变横竖方向；背景须铺满画布无黑边，且为抠图后合成的纯净背景、无原图环境透出。`
      : `2K 高清约 ${outPx.width}×${outPx.height} 像素，画幅宽高比严格等于 ${size.widthMm}×${size.heightMm} mm；背景须铺满画布无黑边，且为抠图后合成的纯净背景、无原图环境透出。`
  const inputOrderNote = buildInputOrderNote(hasClothingImage, hasBackgroundReference)
  const backgroundInstruction = buildBackgroundInstruction(
    backgroundColorKey,
    hasBackgroundReference
  )
  const clothingNote = buildClothingNote(hasClothingImage, hasBackgroundReference)

  return DEFAULT_PROMPT_TEMPLATE.replace("{{sizeName}}", size.name)
    .replace("{{inputOrderNote}}", inputOrderNote)
    .replace("{{orientationNote}}", orientationNote)
    .replace("{{backgroundInstruction}}", backgroundInstruction)
    .replace("{{outputSpec}}", outputSpec)
    .replace("{{clothingNote}}", clothingNote)
}

// 获取带有当前参数的默认模板（用于显示）
export function getDefaultPromptWithParams(
  sizeKey: PhotoSizeKey,
  backgroundColorKey: BackgroundColorKey,
  hasClothingImage: boolean,
  hasBackgroundReference: boolean = false,
  customWidthMm?: number,
  customHeightMm?: number,
  sourcePixelWidth?: number,
  sourcePixelHeight?: number
): string {
  return generatePrompt(sizeKey, backgroundColorKey, {
    hasClothingImage,
    hasBackgroundReference,
    customWidthMm,
    customHeightMm,
    sourcePixelWidth,
    sourcePixelHeight,
  })
}
