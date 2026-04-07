"use client"

import { useState, useEffect, useCallback } from "react"
import { Sparkles, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { PhotoUpload } from "@/components/id-photo/photo-upload"
import { PreviewPanel } from "@/components/id-photo/preview-panel"
import { HistoryPanel } from "@/components/id-photo/history-panel"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useVintageRestore } from "@/hooks/use-vintage-restore"
import { DEFAULT_VINTAGE_PROMPT } from "@/lib/vintage-defaults"
import {
  guestQuotaExceeded,
  incrementGuestUsageIfGuest,
  isGuestSession,
} from "@/lib/client-ark-settings"
import { photoSizeFromImagePixels } from "@/lib/photo-sizes"
import { generateSinglePhoto, downloadImage } from "@/lib/layout-generator"
import { readImageNaturalSize } from "@/lib/read-image-natural-size"
import type { HistoryRecord, HistoryRecordInput } from "@/lib/photo-types"

interface VintageRestorePanelProps {
  onApiUsage?: (inputTokens: number, outputTokens: number) => void
  records: HistoryRecord[]
  onDeleteRecord: (id: string) => void
  onClearVintageHistory: () => void
  addRecord: (record: HistoryRecordInput) => void
  /** 访客成功消耗一次额度后通知父级刷新顶栏剩余次数 */
  onGuestUsageConsumed?: () => void
  /** 访客次数用尽时由父级弹出提示 */
  onGuestQuotaBlocked?: () => void
}

export function VintageRestorePanel({
  onApiUsage,
  records,
  onDeleteRecord,
  onClearVintageHistory,
  addRecord,
  onGuestUsageConsumed,
  onGuestQuotaBlocked,
}: VintageRestorePanelProps) {
  const [image, setImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState(DEFAULT_VINTAGE_PROMPT)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [sourceW, setSourceW] = useState(3)
  const [sourceH, setSourceH] = useState(4)
  const [sourceDimsReady, setSourceDimsReady] = useState(false)
  /** 最近一次请求 API 时实际使用的宽高（压缩后可能与预览原图不同） */
  const [layoutSourcePx, setLayoutSourcePx] = useState<{
    w: number
    h: number
  } | null>(null)

  const { isGenerating, progress, elapsedSeconds, lastDurationMs, error, restore } =
    useVintageRestore({
    onSuccess: (url, usage, submitted) => {
      incrementGuestUsageIfGuest()
      onGuestUsageConsumed?.()
      setResultUrl(url)
      const w = submitted?.width ?? sourceW
      const h = submitted?.height ?? sourceH
      setLayoutSourcePx({ w, h })
      addRecord({
        kind: "vintage",
        imageUrl: url,
        sizeKey: "originalAspect",
        sourceWidthPx: w,
        sourceHeightPx: h,
        backgroundColorKey: "white",
      })
      if (usage && onApiUsage) {
        onApiUsage(usage.input_tokens, usage.output_tokens)
      }
    },
  })

  useEffect(() => {
    if (!image) {
      setSourceW(3)
      setSourceH(4)
      setSourceDimsReady(false)
      setLayoutSourcePx(null)
      return
    }
    setSourceDimsReady(false)
    let cancelled = false
    void readImageNaturalSize(image).then(({ width, height }) => {
      if (!cancelled) {
        setSourceW(width)
        setSourceH(height)
        setSourceDimsReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [image])

  const handleImageChange = useCallback((next: string | null) => {
    setImage(next)
    setLayoutSourcePx(null)
    if (!next) setResultUrl(null)
  }, [])

  const handleRestore = useCallback(() => {
    if (!image) return
    const effectivePrompt = isGuestSession()
      ? DEFAULT_VINTAGE_PROMPT
      : prompt.trim()
    if (!effectivePrompt) return
    if (guestQuotaExceeded()) {
      onGuestQuotaBlocked?.()
      return
    }
    void restore({
      image,
      prompt: effectivePrompt,
      sourceWidth: sourceW,
      sourceHeight: sourceH,
    })
  }, [image, prompt, sourceW, sourceH, restore, onGuestQuotaBlocked])

  const [isDownloading, setIsDownloading] = useState(false)
  const handleDownload2K = useCallback(async () => {
    if (!resultUrl) return
    setIsDownloading(true)
    try {
      const lw = layoutSourcePx?.w ?? sourceW
      const lh = layoutSourcePx?.h ?? sourceH
      const photoSize = photoSizeFromImagePixels(lw, lh)
      const out = await generateSinglePhoto(resultUrl, photoSize)
      if (out.success && out.dataUrl) {
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
        downloadImage(out.dataUrl, `旧照片修复_2K_${ts}.jpg`)
      }
    } finally {
      setIsDownloading(false)
    }
  }, [resultUrl, sourceW, sourceH, layoutSourcePx])

  const canRun =
    !!image &&
    !isGenerating &&
    sourceDimsReady &&
    (isGuestSession() || !!prompt.trim())

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 text-base font-medium text-foreground">上传照片</h2>
            <PhotoUpload
              label="旧照片"
              description="上传需修复的老照片，横版竖版均可"
              value={image}
              onChange={handleImageChange}
              required
              imageObjectFit="contain"
            />
          </div>

          {!isGuestSession() ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-base font-medium text-foreground">文字要求</h2>
              <div className="space-y-2">
                <Label htmlFor="vintage-prompt" className="text-sm text-muted-foreground">
                  提示词（将随照片一并提交处理）
                </Label>
                <Textarea
                  id="vintage-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={8}
                  className="min-h-[180px] resize-y font-mono text-sm"
                  placeholder={DEFAULT_VINTAGE_PROMPT}
                />
                <p className="text-xs text-muted-foreground">
                  默认英文提示适用于老照片修复；可按需改为中文或补充细节。
                </p>
              </div>
            </div>
          ) : null}

          <div className="lg:hidden space-y-3">
            <Button
              onClick={handleRestore}
              disabled={!canRun}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  开始修复
                </>
              )}
            </Button>
            {resultUrl && (
              <Button
                variant="outline"
                className="w-full"
                disabled={isDownloading}
                onClick={() => void handleDownload2K()}
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                下载 2K 高清图
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <PreviewPanel
              generatedImage={resultUrl}
              isGenerating={isGenerating}
              progress={progress}
              elapsedSeconds={elapsedSeconds}
              lastDurationMs={lastDurationMs}
              aspectWidthMm={sourceW}
              aspectHeightMm={sourceH}
            />
          </div>

          <div className="hidden lg:block space-y-3">
            <Button
              onClick={handleRestore}
              disabled={!canRun}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  开始修复
                </>
              )}
            </Button>
            {resultUrl && (
              <Button
                variant="outline"
                className="w-full"
                disabled={isDownloading}
                onClick={() => void handleDownload2K()}
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                下载 2K 高清图
              </Button>
            )}
            <p className="text-center text-xs text-muted-foreground">
              输出分辨率与上传图比例一致，按 2K 档位生成，下载为高清 JPEG
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <HistoryPanel
              records={records}
              onDelete={onDeleteRecord}
              onClearAll={onClearVintageHistory}
              filterKind="vintage"
            />
          </div>
        </div>
      </div>
    </>
  )
}
