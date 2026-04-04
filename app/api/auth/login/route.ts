import { NextRequest, NextResponse } from "next/server"

const LOGIN_USER = "gcxg"
const LOGIN_PASS = "657862352"

const DEFAULT_MODEL_FALLBACK = "doubao-seedream-3-0-t2i-250415"

/**
 * 校验账号并返回服务端 .env 中的默认 API Key / 模型，供客户端写入 localStorage。
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; password?: string }
    const username = typeof body.username === "string" ? body.username.trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (username !== LOGIN_USER || password !== LOGIN_PASS) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 })
    }

    return NextResponse.json({
      ok: true,
      defaultApiKey: process.env.ARK_API_KEY?.trim() ?? "",
      defaultModel: process.env.ARK_IMAGE_MODEL?.trim() || DEFAULT_MODEL_FALLBACK,
    })
  } catch {
    return NextResponse.json({ error: "请求无效" }, { status: 400 })
  }
}
