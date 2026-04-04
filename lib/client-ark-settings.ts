/**
 * 浏览器端登录态与火山方舟凭据（localStorage）。
 * 注意：密钥存于本地有被 XSS 读取的风险，仅适用于受控内网场景。
 */

export const AUTH_STORAGE_KEY = "gcxg_authed"
export const ARK_API_KEY_STORAGE = "gcxg_ark_api_key"
export const ARK_MODEL_STORAGE = "gcxg_ark_model"

/** member：正式登录；guest：访客体验（有次数上限） */
export const AUTH_KIND_STORAGE_KEY = "gcxg_auth_kind"
export const GUEST_USAGE_STORAGE_KEY = "gcxg_guest_usage"
export const GUEST_TRIAL_LIMIT = 10

/** 登录后展示用固定用户名（不可改） */
export const FIXED_LOGIN_USERNAME = "gcxg"

export function isClientAuthed(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(AUTH_STORAGE_KEY) === "1"
}

export function setClientAuthed(value: boolean): void {
  if (typeof window === "undefined") return
  if (value) localStorage.setItem(AUTH_STORAGE_KEY, "1")
  else localStorage.removeItem(AUTH_STORAGE_KEY)
}

export function clearSession(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(ARK_API_KEY_STORAGE)
  localStorage.removeItem(ARK_MODEL_STORAGE)
  localStorage.removeItem(AUTH_KIND_STORAGE_KEY)
  localStorage.removeItem(GUEST_USAGE_STORAGE_KEY)
}

export function isGuestSession(): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(AUTH_KIND_STORAGE_KEY) === "guest"
}

export function setAuthKindMember(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_KIND_STORAGE_KEY, "member")
}

/** 访客登录：使用服务端环境变量中的 API Key，本地不保存密钥 */
export function enterGuestSession(): void {
  if (typeof window === "undefined") return
  localStorage.setItem(AUTH_STORAGE_KEY, "1")
  localStorage.setItem(AUTH_KIND_STORAGE_KEY, "guest")
  localStorage.removeItem(ARK_API_KEY_STORAGE)
  localStorage.removeItem(ARK_MODEL_STORAGE)
  if (localStorage.getItem(GUEST_USAGE_STORAGE_KEY) === null) {
    localStorage.setItem(GUEST_USAGE_STORAGE_KEY, "0")
  }
}

export function getGuestUsedCount(): number {
  if (typeof window === "undefined") return 0
  const raw = localStorage.getItem(GUEST_USAGE_STORAGE_KEY)
  const n = raw != null ? parseInt(raw, 10) : 0
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function guestQuotaExceeded(): boolean {
  return isGuestSession() && getGuestUsedCount() >= GUEST_TRIAL_LIMIT
}

export function incrementGuestUsageIfGuest(): void {
  if (typeof window === "undefined" || !isGuestSession()) return
  const next = getGuestUsedCount() + 1
  localStorage.setItem(GUEST_USAGE_STORAGE_KEY, String(next))
}

export function getGuestRemainingCount(): number {
  return Math.max(0, GUEST_TRIAL_LIMIT - getGuestUsedCount())
}

export function saveArkCredentials(apiKey: string, model: string): void {
  if (typeof window === "undefined") return
  localStorage.setItem(ARK_API_KEY_STORAGE, apiKey.trim())
  localStorage.setItem(ARK_MODEL_STORAGE, model.trim())
}

export function getArkCredentialsForRequest(): { arkApiKey: string; arkModel: string } {
  if (typeof window === "undefined") return { arkApiKey: "", arkModel: "" }
  return {
    arkApiKey: localStorage.getItem(ARK_API_KEY_STORAGE) ?? "",
    arkModel: localStorage.getItem(ARK_MODEL_STORAGE) ?? "",
  }
}
