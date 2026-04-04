"use client"

import { useEffect, useState } from "react"
import { KeyRound, User } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  FIXED_LOGIN_USERNAME,
  getArkCredentialsForRequest,
  saveArkCredentials,
  clearSession,
} from "@/lib/client-ark-settings"

interface MyAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogout?: () => void
  /** full：正式用户「我的」；guestCredentials：访客仅填密钥与模型 */
  variant?: "full" | "guestCredentials"
}

export function MyAccountDialog({
  open,
  onOpenChange,
  onLogout,
  variant = "full",
}: MyAccountDialogProps) {
  const isGuestKeys = variant === "guestCredentials"
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("")
  useEffect(() => {
    if (!open) {
      return
    }
    const c = getArkCredentialsForRequest()
    setApiKey(c.arkApiKey)
    setModel(c.arkModel)
  }, [open])

  const handleSave = () => {
    saveArkCredentials(apiKey, model)
    onOpenChange(false)
  }

  const handleLogout = () => {
    clearSession()
    onOpenChange(false)
    onLogout?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isGuestKeys ? (
              <KeyRound className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
            {isGuestKeys ? "密钥" : "我的"}
          </DialogTitle>
          <DialogDescription>
            {isGuestKeys
              ? "可选填写火山方舟 API Key 与模型；留空则使用服务端环境变量中的配置。保存后立即生效。"
              : "以下为当前调用火山方舟生成接口使用的凭据；保存后立即生效。"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {!isGuestKeys ? (
            <div className="space-y-2">
              <Label>用户名</Label>
              <Input value={FIXED_LOGIN_USERNAME} readOnly className="bg-muted" />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="my-ark-key">API Key</Label>
            <Input
              id="my-ark-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ARK_API_KEY"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="my-ark-model">当前使用模型</Label>
            <Input
              id="my-ark-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="如 doubao-seedream-…"
            />
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={handleLogout}>
            退出登录
          </Button>
          <Button type="button" onClick={handleSave}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
