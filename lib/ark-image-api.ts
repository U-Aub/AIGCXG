import type { GenerateResponse } from "./photo-types"

/**
 * 调用火山方舟 images/generations，解析为前端可用的 data URL。
 */
export async function callArkImagesGenerations(
  apiKey: string,
  baseUrl: string,
  arkRequestBody: Record<string, unknown>
): Promise<
  | { ok: true; result: GenerateResponse }
  | { ok: false; status: number; error: string }
> {
  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(arkRequestBody),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("豆包API错误:", errorData)

    if (response.status === 401) {
      return {
        ok: false,
        status: 401,
        error:
          "ARK_API_KEY 校验失败。请确认：1) 使用的是火山方舟 API Key（不是 AK/SK）；2) Key 与当前开通模型在同一账号/项目；3) Key 未被禁用或删除。",
      }
    }

    if (response.status === 429) {
      return { ok: false, status: 429, error: "API调用频率超限，请稍后重试" }
    }

    if (response.status === 400) {
      const errorMsg = errorData.error?.message || errorData.message || "请求参数错误"
      return { ok: false, status: 400, error: `请求错误：${errorMsg}` }
    }

    if (response.status === 404) {
      const errorMsg = errorData.error?.message || errorData.message || ""
      const model = String(arkRequestBody.model ?? "")
      if (errorMsg.includes("NotFound") || errorMsg.includes("not exist")) {
        return {
          ok: false,
          status: 404,
          error: `模型未开通：请先在火山方舟控制台开通 ${model} 模型服务`,
        }
      }
      return { ok: false, status: 404, error: `资源不存在：${errorMsg}` }
    }

    return {
      ok: false,
      status: response.status,
      error: errorData.error?.message || errorData.message || `API调用失败: ${response.status}`,
    }
  }

  const data = await response.json()

  if (!data.data || !data.data[0]) {
    return { ok: false, status: 500, error: "API返回数据格式错误" }
  }

  const generatedImage = data.data[0].b64_json || data.data[0].url

  if (!generatedImage) {
    return { ok: false, status: 500, error: "API未返回图像数据" }
  }

  let imageDataUrl: string
  if (generatedImage.startsWith("http")) {
    const imageResponse = await fetch(generatedImage)
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64 = Buffer.from(imageBuffer).toString("base64")
    imageDataUrl = `data:image/png;base64,${base64}`
  } else {
    imageDataUrl = `data:image/png;base64,${generatedImage}`
  }

  const result: GenerateResponse = {
    imageUrl: imageDataUrl,
    usage: data.usage
      ? {
          input_tokens: data.usage.prompt_tokens || 0,
          output_tokens: data.usage.completion_tokens || 0,
        }
      : undefined,
  }

  return { ok: true, result }
}
