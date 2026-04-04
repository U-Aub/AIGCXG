"use client"

import { useState, useEffect } from "react"
import { History, Download, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { resolvePhotoSize, photoSizeFromImagePixels } from "@/lib/photo-sizes"
import { BACKGROUND_COLORS } from "@/lib/background-colors"
import { downloadImage, generateFilename } from "@/lib/layout-generator"
import { resolveHistoryFullImage } from "@/lib/history-storage"
import type { HistoryRecord } from "@/lib/photo-types"

interface HistoryPanelProps {
  records: HistoryRecord[]
  onDelete: (id: string) => void
  onClearAll: () => void
  /** 仅展示指定类型（证件照 / 旧照），不传则展示全部 */
  filterKind?: "idPhoto" | "vintage"
}

export function HistoryPanel({
  records,
  onDelete,
  onClearAll,
  filterKind,
}: HistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [previewRecord, setPreviewRecord] = useState<HistoryRecord | null>(null)
  const [previewFullUrl, setPreviewFullUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (!previewRecord) {
      setPreviewFullUrl(null)
      setPreviewLoading(false)
      return
    }
    setPreviewLoading(true)
    setPreviewFullUrl(null)
    let cancelled = false
    void resolveHistoryFullImage(previewRecord).then((url) => {
      if (!cancelled) {
        setPreviewFullUrl(url)
        setPreviewLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [previewRecord])

  const visibleRecords = filterKind
    ? records.filter((r) =>
        filterKind === "vintage"
          ? r.kind === "vintage"
          : !r.kind || r.kind === "idPhoto"
      )
    : records

  const recordPhotoSize = (record: HistoryRecord) => {
    if (
      record.kind === "vintage" ||
      (record.sizeKey === "originalAspect" &&
        record.sourceWidthPx != null &&
        record.sourceHeightPx != null)
    ) {
      const sw = record.sourceWidthPx ?? 3
      const sh = record.sourceHeightPx ?? 4
      return photoSizeFromImagePixels(sw, sh)
    }
    return resolvePhotoSize(
      record.sizeKey,
      record.sizeKey === "custom" &&
        record.customWidthMm != null &&
        record.customHeightMm != null
        ? { width: record.customWidthMm, height: record.customHeightMm }
        : null
    )
  }

  const recordLabel = (record: HistoryRecord) => {
    if (record.kind === "vintage") return "旧照片修复"
    return recordPhotoSize(record).name
  }

  const handleDownload = async (record: HistoryRecord) => {
    const photoSize = recordPhotoSize(record)
    const filename =
      record.kind === "vintage"
        ? (() => {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
            return `旧照片修复_2K_${timestamp}.jpg`
          })()
        : generateFilename(photoSize, record.backgroundColorKey, false, "证件照")
    const full = await resolveHistoryFullImage(record)
    if (!full) {
      window.alert("无法读取该条完整图片（可能因浏览器禁用存储或数据已清理），请重新处理生成后再下载。")
      return
    }
    downloadImage(full, filename)
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (visibleRecords.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground hover:text-foreground/80"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <span>历史记录 ({visibleRecords.length})</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visibleRecords.map((record) => (
              <div
                key={record.id}
                className="group relative overflow-hidden rounded-lg border border-border bg-muted"
              >
                <button
                  type="button"
                  className="aspect-[3/4] w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setPreviewRecord(record)}
                >
                  <img
                    src={record.thumbnailUrl}
                    alt="历史记录，点击放大"
                    className="h-full w-full object-cover"
                  />
                </button>
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDownload(record)
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteId(record.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="text-xs text-white">
                    <p>
                      {record.kind === "vintage" ? (
                        <>旧照片修复</>
                      ) : (
                        <>
                          {recordLabel(record)} /{" "}
                          {BACKGROUND_COLORS[record.backgroundColorKey].name}
                        </>
                      )}
                    </p>
                    <p className="text-white/70">{formatTime(record.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setShowClearDialog(true)}
            >
              <Trash2 className="mr-1 h-3 w-3" />
              清空历史
            </Button>
          </div>
        </div>
      )}

      {/* 删除单条确认 */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条历史记录吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId)
                  setDeleteId(null)
                }
              }}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!previewRecord}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewRecord(null)
            setPreviewFullUrl(null)
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>查看大图</DialogTitle>
          </DialogHeader>
          <div className="flex max-h-[min(75vh,720px)] min-h-[200px] items-center justify-center rounded-md border border-border bg-muted/30">
            {previewLoading ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : previewFullUrl ? (
              <img
                src={previewFullUrl}
                alt="历史记录大图"
                className="max-h-[min(75vh,720px)] w-full object-contain"
              />
            ) : (
              <p className="px-4 text-center text-sm text-muted-foreground">
                无法加载完整图片，请尝试重新处理生成后再查看。
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 清空全部确认 */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空</AlertDialogTitle>
            <AlertDialogDescription>
              确定要清空所有历史记录吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClearAll()
                setShowClearDialog(false)
              }}
            >
              清空
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
