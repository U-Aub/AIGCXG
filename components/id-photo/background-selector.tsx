"use client"

import { cn } from "@/lib/utils"
import { BACKGROUND_COLOR_OPTIONS } from "@/lib/background-colors"
import type { BackgroundColorKey } from "@/lib/photo-types"
import { PhotoUpload } from "@/components/id-photo/photo-upload"

interface BackgroundSelectorProps {
  value: BackgroundColorKey
  onChange: (value: BackgroundColorKey) => void
  customBackgroundImage: string | null
  onCustomBackgroundChange: (value: string | null) => void
}

export function BackgroundSelector({
  value,
  onChange,
  customBackgroundImage,
  onCustomBackgroundChange,
}: BackgroundSelectorProps) {
  const handlePresetClick = (key: BackgroundColorKey) => {
    onCustomBackgroundChange(null)
    onChange(key)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">背景颜色</label>
      <div className="flex flex-wrap items-center gap-3">
        {BACKGROUND_COLOR_OPTIONS.map((color) => (
          <button
            key={color.key}
            type="button"
            onClick={() => handlePresetClick(color.key)}
            className={cn(
              "group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 transition-all",
              value === color.key && !customBackgroundImage
                ? "border-primary ring-2 ring-primary ring-offset-2"
                : "border-border hover:border-primary/50"
            )}
            style={{ backgroundColor: color.hex }}
            title={color.name}
          >
            {color.key === "white" && (
              <div className="absolute inset-0 rounded-md border border-gray-200" />
            )}
            <span className="sr-only">{color.name}</span>
          </button>
        ))}

        <div
          className={cn(
            "shrink-0 rounded-lg",
            customBackgroundImage && "ring-2 ring-primary ring-offset-2"
          )}
        >
          <PhotoUpload
            variant="thumbnail"
            label="自定义背景"
            value={customBackgroundImage}
            onChange={onCustomBackgroundChange}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        当前：
        {customBackgroundImage
          ? "自定义背景图（优先于纯色）"
          : BACKGROUND_COLOR_OPTIONS.find((c) => c.key === value)?.name}
        。右侧方块与色块同尺寸；点纯色可清除上传图。
      </p>
    </div>
  )
}
