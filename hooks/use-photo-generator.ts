"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type {
  PhotoSizeKey,
  BackgroundColorKey,
  GenerateRequest,
  GenerateResponse,
} from "@/lib/photo-types"
import { generatePrompt } from "@/lib/prompt-templates"
import { getArkCredentialsForRequest } from "@/lib/client-ark-settings"

interface UsePhotoGeneratorOptions {
  onSuccess?: (imageUrl: string, usage?: { input_tokens: number; output_tokens: number }) => void
  onError?: (error: string) => void
}

interface UsePhotoGeneratorReturn {
  isGenerating: boolean
  progress: number
  /** 处理已进行秒数（进行中刷新） */
  elapsedSeconds: number
  /** 最近一次成功完成时的总耗时（毫秒），新任务开始时清空 */
  lastDurationMs: number | null
  error: string | null
  generate: (params: {
    image: string
    clothingImage?: string | null
    backgroundReferenceImage?: string | null
    sizeKey: PhotoSizeKey
    backgroundColorKey: BackgroundColorKey
    customPrompt?: string
    customWidthMm?: number
    customHeightMm?: number
    sourceWidth?: number
    sourceHeight?: number
  }) => Promise<void>
  cancel: () => void
}

export function usePhotoGenerator(options?: UsePhotoGeneratorOptions): UsePhotoGeneratorReturn {
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

  const generate = useCallback(
    async (params: {
      image: string
      clothingImage?: string | null
      backgroundReferenceImage?: string | null
      sizeKey: PhotoSizeKey
      backgroundColorKey: BackgroundColorKey
      customPrompt?: string
      customWidthMm?: number
      customHeightMm?: number
      sourceWidth?: number
      sourceHeight?: number
    }) => {
      setIsGenerating(true)
      setProgress(0)
      setElapsedSeconds(0)
      setLastDurationMs(null)
      startedAtRef.current = Date.now()
      setError(null)

      const controller = new AbortController()
      setAbortController(controller)

      // 模拟进度
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 10
        })
      }, 500)

      try {
        const prompt = params.customPrompt || generatePrompt(
          params.sizeKey,
          params.backgroundColorKey,
          {
            hasClothingImage: !!params.clothingImage,
            hasBackgroundReference: !!params.backgroundReferenceImage,
            customWidthMm: params.customWidthMm,
            customHeightMm: params.customHeightMm,
            sourcePixelWidth:
              params.sizeKey === "originalAspect" ? params.sourceWidth : undefined,
            sourcePixelHeight:
              params.sizeKey === "originalAspect" ? params.sourceHeight : undefined,
          }
        )

        const creds = getArkCredentialsForRequest()
        const requestBody: GenerateRequest = {
          image: params.image,
          clothingImage: params.clothingImage || undefined,
          backgroundReferenceImage: params.backgroundReferenceImage || undefined,
          sizeKey: params.sizeKey,
          customWidthMm:
            params.sizeKey === "custom" ? params.customWidthMm : undefined,
          customHeightMm:
            params.sizeKey === "custom" ? params.customHeightMm : undefined,
          backgroundColorKey: params.backgroundColorKey,
          customPrompt: prompt,
          arkApiKey: creds.arkApiKey || undefined,
          arkModel: creds.arkModel || undefined,
          ...(params.sizeKey === "originalAspect" &&
          params.sourceWidth != null &&
          params.sourceHeight != null
            ? { sourceWidth: params.sourceWidth, sourceHeight: params.sourceHeight }
            : {}),
        }

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
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
    generate,
    cancel,
  }
}
