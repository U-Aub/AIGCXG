"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { GenerateResponse, VintageRestoreRequest } from "@/lib/photo-types"
import { getArkCredentialsForRequest } from "@/lib/client-ark-settings"

interface UseVintageRestoreOptions {
  onSuccess?: (imageUrl: string, usage?: { input_tokens: number; output_tokens: number }) => void
  onError?: (error: string) => void
}

export function useVintageRestore(options?: UseVintageRestoreOptions) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const startedAtRef = useRef(0)

  useEffect(() => {
    if (!isGenerating) return
    const tick = () => {
      setElapsedSeconds(
        Math.floor((Date.now() - startedAtRef.current) / 1000)
      )
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [isGenerating])

  const restore = useCallback(
    async (params: {
      image: string
      prompt: string
      sourceWidth: number
      sourceHeight: number
    }) => {
      setIsGenerating(true)
      setProgress(0)
      setElapsedSeconds(0)
      setLastDurationMs(null)
      startedAtRef.current = Date.now()
      setError(null)

      const controller = new AbortController()
      setAbortController(controller)

      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 10))
      }, 500)

      try {
        const creds = getArkCredentialsForRequest()
        const body: VintageRestoreRequest = {
          mode: "vintage",
          image: params.image,
          prompt: params.prompt,
          sourceWidth: params.sourceWidth,
          sourceHeight: params.sourceHeight,
          arkApiKey: creds.arkApiKey || undefined,
          arkModel: creds.arkModel || undefined,
        }

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `请求失败: ${response.status}`)
        }

        const data: GenerateResponse = await response.json()
        setProgress(100)
        setLastDurationMs(Date.now() - startedAtRef.current)
        options?.onSuccess?.(data.imageUrl, data.usage)
      } catch (err) {
        if (err instanceof Error) {
          if (err.name === "AbortError") {
            setError("处理已取消")
          } else {
            setError(err.message)
            options?.onError?.(err.message)
          }
        } else {
          setError("未知错误")
          options?.onError?.("未知错误")
        }
      } finally {
        clearInterval(progressInterval)
        setIsGenerating(false)
        setAbortController(null)
      }
    },
    [options]
  )

  const cancel = useCallback(() => {
    abortController?.abort()
  }, [abortController])

  return {
    isGenerating,
    progress,
    elapsedSeconds,
    lastDurationMs,
    error,
    restore,
    cancel,
  }
}
