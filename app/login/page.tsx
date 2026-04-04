"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { isClientAuthed } from "@/lib/client-ark-settings"

export default function LoginPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (isClientAuthed()) {
      router.replace("/")
      return
    }
    setShowForm(true)
  }, [router])

  if (!showForm) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        加载中…
      </div>
    )
  }

  return <LoginForm onLoggedIn={() => router.push("/")} />
}
