"use client"

import { ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ESTIMATED_PROCESSING_SECONDS,
  formatElapsedClock,
  formatTotalDurationMs,
  remainingSecondsFromEstimate,
} from "@/lib/format-duration"

interface PreviewPanelProps {
  generatedImage: string | null
  isGenerating: boolean
  progress?: number
  /** 已进行秒数（用于与预计时长对比显示倒计时） */
  elapsedSeconds?: number
  /** 最近一次成功完成总耗时（毫秒） */
  lastDurationMs?: number | null
  /** 与所选证件照毫米比例一致，保证横版/竖版预览框与输出规格一致 */
  aspectWidthMm: number
  aspectHeightMm: number
}

export function PreviewPanel({
  generatedImage,
  isGenerating,
  progress = 0,
  elapsedSeconds = 0,
  lastDurationMs = null,
  aspectWidthMm,
  aspectHeightMm,
}: PreviewPanelProps) {
  const arW = Math.max(1, aspectWidthMm)
  const arH = Math.max(1, aspectHeightMm)
  const remainingEstimate = remainingSecondsFromEstimate(elapsedSeconds)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">处理结果</h3>
      <div className="flex w-full justify-center">
        <div
          className={cn(
            "relative flex w-full max-w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted",
            "max-h-[min(70vh,42rem)]"
          )}
          style={{ aspectRatio: `${arW} / ${arH}` }}
        >
        {isGenerating ? (
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-10 w-10">
              <svg className="h-10 w-10 animate-spin" viewBox="0 0 40 40">
                <circle
                  className="stroke-muted-foreground/20"
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  strokeWidth="3"
                />
                <circle
                  className="stroke-primary"
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={100}
                  strokeDashoffset={100 - progress}
                  transform="rotate(-90 20 20)"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="font-mono text-sm font-medium tabular-nums text-foreground">
                预计时长 {formatElapsedClock(ESTIMATED_PROCESSING_SECONDS)} · 剩余{" "}
                {formatElapsedClock(remainingEstimate)}
              </span>
              <span className="max-w-[16rem] text-xs text-muted-foreground">
                {remainingEstimate === 0
                  ? "已超过预计时间，仍在处理中，请勿切换网页"
                  : "处理中，请勿切换网页"}
              </span>
            </div>
          </div>
        ) : generatedImage ? (
          <div className="relative flex h-full w-full flex-col">
            <img
              src={generatedImage}
              alt="处理结果"
              className="h-full w-full flex-1 object-contain"
            />
            {lastDurationMs != null ? (
              <p className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-sm">
                本次处理总耗时 {formatTotalDurationMs(lastDurationMs)}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">等待处理</span>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
