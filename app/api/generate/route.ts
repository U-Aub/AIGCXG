import { NextRequest, NextResponse } from "next/server"
import type { GenerateRequest, VintageRestoreRequest } from "@/lib/photo-types"
import { PHOTO_SIZES, resolvePhotoSize, computeOutputSizePixels, photoSizeFromImagePixels } from "@/lib/photo-sizes"
import { BACKGROUND_COLORS } from "@/lib/background-colors"
import { generatePrompt } from "@/lib/prompt-templates"
import { callArkImagesGenerations } from "@/lib/ark-image-api"

export const maxDuration = 60 // 最大执行时间60秒

const ARK_BASE_URL = process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3"
const DEFAULT_MODEL_FALLBACK = "doubao-seedream-3-0-t2i-250415"

function parseArkFromBody(body: Record<string, unknown>): { apiKey: string; model: string } {
  const arkApiKey = typeof body.arkApiKey === "string" ? body.arkApiKey.trim() : ""
  const arkModel = typeof body.arkModel === "string" ? body.arkModel.trim() : ""
  const apiKey = arkApiKey || process.env.ARK_API_KEY?.trim() || ""
  const model = arkModel || process.env.ARK_IMAGE_MODEL?.trim() || DEFAULT_MODEL_FALLBACK
  return { apiKey, model }
}

function modelSupportsMultiImage(modelId: string): boolean {
  return modelId.includes("seedream") || modelId.includes("seededit")
}

function toNextResponse(
  ark: Awaited<ReturnType<typeof callArkImagesGenerations>>
): NextResponse {
  if (ark.ok) {
    return NextResponse.json(ark.result)
  }
  return NextResponse.json({ error: ark.error }, { status: ark.status })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const { apiKey, model } = parseArkFromBody(body)

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "未配置 API Key：请登录后在右上角「我的」中填写并保存，或由服务端配置环境变量 ARK_API_KEY",
        },
        { status: 401 }
      )
    }

    if (body.mode === "vintage") {
      const v = body as unknown as VintageRestoreRequest
      const { image, prompt, sourceWidth, sourceHeight } = v

      if (!image || typeof image !== "string") {
        return NextResponse.json({ error: "请上传照片" }, { status: 400 })
      }

      const text = typeof prompt === "string" ? prompt.trim() : ""
      if (!text) {
        return NextResponse.json({ error: "请填写文字要求" }, { status: 400 })
      }

      const sw = Number(sourceWidth)
      const sh = Number(sourceHeight)
      if (
        !Number.isFinite(sw) ||
        !Number.isFinite(sh) ||
        sw < 1 ||
        sh < 1 ||
        sw > 8192 ||
        sh > 8192
      ) {
        return NextResponse.json({ error: "无效的图片尺寸参数" }, { status: 400 })
      }

      const imageUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`
      const ratioSize = photoSizeFromImagePixels(sw, sh)
      const outPx = computeOutputSizePixels(ratioSize)

      const requestBody: Record<string, unknown> = {
        model,
        prompt: text,
        image: imageUrl,
        size: `${outPx.width}x${outPx.height}`,
        watermark: false,
      }
      if (model.includes("seededit")) {
        requestBody.guidance_scale = 5.5
      }

      console.log("[v0] 旧照片处理，模型:", model)
      const ark = await callArkImagesGenerations(apiKey, ARK_BASE_URL, requestBody)
      return toNextResponse(ark)
    }

    const idBody = body as unknown as GenerateRequest
    const {
      image,
      clothingImage,
      backgroundReferenceImage,
      sizeKey,
      customWidthMm,
      customHeightMm,
      backgroundColorKey,
      customPrompt,
      sourceWidth,
      sourceHeight,
    } = idBody

    if (!image) {
      return NextResponse.json({ error: "请上传生活照" }, { status: 400 })
    }

    if (!sizeKey || !PHOTO_SIZES[sizeKey]) {
      return NextResponse.json({ error: "无效的尺寸选择" }, { status: 400 })
    }

    if (!backgroundColorKey || !BACKGROUND_COLORS[backgroundColorKey]) {
      return NextResponse.json({ error: "无效的背景色选择" }, { status: 400 })
    }

    if (sizeKey === "custom") {
      const w = customWidthMm
      const h = customHeightMm
      if (
        w == null ||
        h == null ||
        !Number.isFinite(w) ||
        !Number.isFinite(h) ||
        w < 5 ||
        h < 5 ||
        w > 500 ||
        h > 500
      ) {
        return NextResponse.json(
          { error: "自定义尺寸需在 5～500mm 之间，请填写有效的宽高（毫米）" },
          { status: 400 }
        )
      }
    }

    if (sizeKey === "originalAspect") {
      const sw = Number(sourceWidth)
      const sh = Number(sourceHeight)
      if (
        !Number.isFinite(sw) ||
        !Number.isFinite(sh) ||
        sw < 1 ||
        sh < 1 ||
        sw > 8192 ||
        sh > 8192
      ) {
        return NextResponse.json(
          { error: "原尺寸模式需有效上传图宽高像素，请重新选择照片后再试" },
          { status: 400 }
        )
      }
    }

    const customMm =
      sizeKey === "custom" && customWidthMm != null && customHeightMm != null
        ? { width: customWidthMm, height: customHeightMm }
        : null
    const sourcePixels =
      sizeKey === "originalAspect" && sourceWidth != null && sourceHeight != null
        ? { width: Number(sourceWidth), height: Number(sourceHeight) }
        : null
    const photoSize = resolvePhotoSize(sizeKey, customMm, sourcePixels)

    const hasClothingRef = Boolean(clothingImage?.trim())
    const hasBackgroundRef = Boolean(backgroundReferenceImage?.trim())
    const multiImageSupported = modelSupportsMultiImage(model)
    if ((hasClothingRef || hasBackgroundRef) && !multiImageSupported) {
      return NextResponse.json(
        {
          error:
            "当前模型不支持参考图多图输入，请改用 Seedream / SeedEdit 系列模型，或去掉服装/自定义背景参考图后重试。",
        },
        { status: 400 }
      )
    }

    let prompt =
      customPrompt ||
      generatePrompt(sizeKey, backgroundColorKey, {
        hasClothingImage: hasClothingRef,
        hasBackgroundReference: hasBackgroundRef,
        customWidthMm: customMm?.width,
        customHeightMm: customMm?.height,
        sourcePixelWidth: sourcePixels?.width,
        sourcePixelHeight: sourcePixels?.height,
      })

    if (
      hasClothingRef &&
      customPrompt &&
      !customPrompt.includes("服装") &&
      !customPrompt.includes("第二张")
    ) {
      prompt +=
        "\n\n【补充】第二张输入图为服装参考图，请将第一张人像照片中的衣着替换为与参考图一致或相近的款式与颜色。"
    }

    if (
      hasBackgroundRef &&
      customPrompt &&
      !customPrompt.includes("背景参考") &&
      !customPrompt.includes("最后一张")
    ) {
      prompt +=
        "\n\n【补充】最后一张输入图为背景参考图，请使人像背景与该参考图一致或相近。"
    }

    const imageUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`

    const clothingUrl = clothingImage?.trim()
      ? clothingImage.startsWith("data:")
        ? clothingImage
        : `data:image/jpeg;base64,${clothingImage}`
      : null

    const backgroundRefUrl = backgroundReferenceImage?.trim()
      ? backgroundReferenceImage.startsWith("data:")
        ? backgroundReferenceImage
        : `data:image/jpeg;base64,${backgroundReferenceImage}`
      : null

    const imageParts: string[] = [imageUrl]
    if (clothingUrl) imageParts.push(clothingUrl)
    if (backgroundRefUrl) imageParts.push(backgroundRefUrl)

    const outPx = computeOutputSizePixels(photoSize)

    const requestBody: Record<string, unknown> = {
      model,
      prompt: prompt,
      image: imageParts.length === 1 ? imageParts[0] : imageParts,
      size: `${outPx.width}x${outPx.height}`,
      watermark: false,
    }
    if (model.includes("seededit")) {
      requestBody.guidance_scale = 5.5
    }

    console.log("[v0] 调用豆包API，模型:", model)

    const ark = await callArkImagesGenerations(apiKey, ARK_BASE_URL, requestBody)
    return toNextResponse(ark)
  } catch (error) {
    console.error("生成API错误:", error)

    if (error instanceof Error) {
      if (error.message.includes("fetch") || error.message.includes("network")) {
        return NextResponse.json(
          { error: "网络请求失败，请检查网络连接" },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
