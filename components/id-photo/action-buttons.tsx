"use client"

import { useState } from "react"
import { Sparkles, Download, LayoutGrid, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LAYOUT_CONFIGS } from "@/lib/photo-sizes"
import {
  generateA6Layout,
  generateSinglePhoto,
  downloadImage,
  generateFilename,
} from "@/lib/layout-generator"
import type { PhotoSizeKey, BackgroundColorKey, PhotoSize } from "@/lib/photo-types"

interface ActionButtonsProps {
  canGenerate: boolean
  isGenerating: boolean
  generatedImage: string | null
  sizeKey: PhotoSizeKey
  backgroundColorKey: BackgroundColorKey
  /** 下载文件名中的背景标识（例如上传自定义背景时用「自定义背景」） */
  downloadBackgroundLabel?: string
  resolvedPhotoSize: PhotoSize
  onGenerate: () => void
}

export function ActionButtons({
  canGenerate,
  isGenerating,
  generatedImage,
  sizeKey,
  backgroundColorKey,
  downloadBackgroundLabel,
  resolvedPhotoSize,
  onGenerate,
}: ActionButtonsProps) {
  const bgLabel = downloadBackgroundLabel ?? backgroundColorKey
  const [isDownloading, setIsDownloading] = useState(false)
  const [isLayoutDownloading, setIsLayoutDownloading] = useState(false)
  const [showLayoutDialog, setShowLayoutDialog] = useState(false)
  const [layoutError, setLayoutError] = useState<string | null>(null)

  const layoutConfig = LAYOUT_CONFIGS[sizeKey]

  const handleSingleDownload = async () => {
    if (!generatedImage) return
    setIsDownloading(true)
    try {
      const result = await generateSinglePhoto(generatedImage, resolvedPhotoSize)
      if (result.success && result.dataUrl) {
        const filename = generateFilename(resolvedPhotoSize, bgLabel)
        downloadImage(result.dataUrl, filename)
      }
    } finally {
      setIsDownloading(false)
    }
  }

  const handleLayoutDownload = async () => {
    if (!generatedImage) return

    // 检查是否支持排版
    if (!layoutConfig.supported) {
      setLayoutError(layoutConfig.message || "此尺寸不支持排版打印")
      setShowLayoutDialog(true)
      return
    }

    setIsLayoutDownloading(true)
    try {
      const result = await generateA6Layout(generatedImage, sizeKey, resolvedPhotoSize)
      if (result.success && result.dataUrl) {
        const filename = generateFilename(resolvedPhotoSize, bgLabel, true)
        downloadImage(result.dataUrl, filename)
      } else {
        setLayoutError(result.message || "排版处理失败")
        setShowLayoutDialog(true)
      }
    } finally {
      setIsLayoutDownloading(false)
    }
  }

  // 获取排版信息文本
  const getLayoutInfo = () => {
    if (!layoutConfig.supported) return null
    const count = layoutConfig.rows * layoutConfig.cols
    return `${resolvedPhotoSize.name} ${count}张 (${layoutConfig.rows}×${layoutConfig.cols})`
  }

  return (
    <>
      <div className="space-y-3">
        <Button
          onClick={onGenerate}
          disabled={!canGenerate || isGenerating}
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
              处理证件照
            </>
          )}
        </Button>

        {generatedImage && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={handleSingleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              单张下载
            </Button>
            <Button
              variant="outline"
              onClick={handleLayoutDownload}
              disabled={isLayoutDownloading}
            >
              {isLayoutDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LayoutGrid className="mr-2 h-4 w-4" />
              )}
              A6排版打印
            </Button>
          </div>
        )}

        {generatedImage && layoutConfig.supported && (
          <p className="text-center text-xs text-muted-foreground">
            A6排版：{getLayoutInfo()}
          </p>
        )}
      </div>

      <Dialog open={showLayoutDialog} onOpenChange={setShowLayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>排版提示</DialogTitle>
            <DialogDescription>{layoutError}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowLayoutDialog(false)}>知道了</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
