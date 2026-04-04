"use client"

import { useState } from "react"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  saveArkCredentials,
  setClientAuthed,
  FIXED_LOGIN_USERNAME,
  setAuthKindMember,
  enterGuestSession,
} from "@/lib/client-ark-settings"

interface LoginFormProps {
  onLoggedIn: () => void
}

export function LoginForm({ onLoggedIn }: LoginFormProps) {
  const [username, setUsername] = useState(FIXED_LOGIN_USERNAME)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGuestLogin = () => {
    enterGuestSession()
    onLoggedIn()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        defaultApiKey?: string
        defaultModel?: string
      }
      if (!res.ok) {
        setError(data.error || "登录失败")
        return
      }
      // 仅保存服务端下发的 API Key；模型由用户在「我的」中自行填写，登录时不预填默认模型
      saveArkCredentials(data.defaultApiKey ?? "", "")
      setAuthKindMember()
      setClientAuthed(true)
      onLoggedIn()
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image
            src="/logo.png"
            alt="照片处理"
            width={80}
            height={80}
            className="h-16 w-16 object-contain"
            priority
          />
          <h1 className="text-xl font-semibold text-foreground">照片处理</h1>
          <p className="text-sm text-muted-foreground">
            请登录后使用证件照与旧照片功能
          </p>
        </div>
        <div className="space-y-3">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            size="lg"
            onClick={handleGuestLogin}
          >
            访客体验登录
          </Button>
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">或正式账号</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-user">用户名</Label>
            <Input
              id="login-user"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-pass">密码</Label>
            <Input
              id="login-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                登录中…
              </>
            ) : (
              "登录"
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
