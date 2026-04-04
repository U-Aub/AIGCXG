"use client"

import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PHOTO_SIZE_OPTIONS } from "@/lib/photo-sizes"
import type { PhotoSizeKey } from "@/lib/photo-types"

interface SizeSelectorProps {
  value: PhotoSizeKey
  onChange: (value: PhotoSizeKey) => void
  customWidthMm: number
  customHeightMm: number
  onCustomMmChange: (width: number, height: number) => void
}

export function SizeSelector({
  value,
  onChange,
  customWidthMm,
  customHeightMm,
  onCustomMmChange,
}: SizeSelectorProps) {
  const [customDialogOpen, setCustomDialogOpen] = useState(false)
  const [draftW, setDraftW] = useState(String(customWidthMm))
  const [draftH, setDraftH] = useState(String(customHeightMm))
  const [mmError, setMmError] = useState("")

  useEffect(() => {
    if (customDialogOpen) {
      setDraftW(String(customWidthMm))
      setDraftH(String(customHeightMm))
      setMmError("")
    }
  }, [customDialogOpen, customWidthMm, customHeightMm])

  const handleSelectChange = (v: string) => {
    const key = v as PhotoSizeKey
    if (key === "custom") {
      onChange("custom")
      setCustomDialogOpen(true)
      return
    }
    onChange(key)
  }

  const applyCustomMm = () => {
    const w = Number.parseFloat(draftW)
    const h = Number.parseFloat(draftH)
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 5 || h < 5 || w > 500 || h > 500) {
      return false
    }
    onCustomMmChange(w, h)
    return true
  }

  const handleConfirmCustom = () => {
    if (!applyCustomMm()) {
      setMmError("宽高需为 5～500mm 之间的有效数字")
      return
    }
    setMmError("")
    setCustomDialogOpen(false)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">证件照尺寸</label>
      <Select value={value} onValueChange={handleSelectChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="选择尺寸" />
        </SelectTrigger>
        <SelectContent>
          {PHOTO_SIZE_OPTIONS.map((size) => (
            <SelectItem key={size.key} value={size.key}>
              <div className="flex items-center gap-2">
                <span>{size.name}</span>
                <span className="text-xs text-muted-foreground">
                  {size.key === "custom"
                    ? "（毫米）"
                    : size.key === "originalAspect"
                      ? "（随上传图比例）"
                      : `(${size.widthMm}×${size.heightMm}mm)`}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value === "custom" && (
        <p className="text-xs text-muted-foreground">
          当前自定义：{customWidthMm}×{customHeightMm} mm
          <button
            type="button"
            className="ml-2 text-primary underline-offset-2 hover:underline"
            onClick={() => setCustomDialogOpen(true)}
          >
            修改
          </button>
        </p>
      )}

      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>自定义尺寸</DialogTitle>
            <DialogDescription>请输入证件照物理尺寸，单位：毫米（mm），范围 5～500。</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">宽（mm）</label>
              <Input
                type="number"
                min={5}
                max={500}
                step={1}
                value={draftW}
                onChange={(e) => setDraftW(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">高（mm）</label>
              <Input
                type="number"
                min={5}
                max={500}
                step={1}
                value={draftH}
                onChange={(e) => setDraftH(e.target.value)}
              />
            </div>
          </div>
          {mmError ? <p className="text-xs text-destructive">{mmError}</p> : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCustomDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleConfirmCustom}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
