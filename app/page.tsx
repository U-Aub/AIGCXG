"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppMain } from "@/components/app-main"
import { isClientAuthed } from "@/lib/client-ark-settings"

export default function HomePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isClientAuthed()) {
      router.replace("/login")
      return
    }
    setReady(true)
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        加载中…
      </div>
    )
  }

  return <AppMain />
}
