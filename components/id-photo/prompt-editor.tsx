"use client"

import { useState } from "react"
import { ChevronDown, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { getDefaultPromptWithParams } from "@/lib/prompt-templates"
import type { PhotoSizeKey, BackgroundColorKey } from "@/lib/photo-types"

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  sizeKey: PhotoSizeKey
  backgroundColorKey: BackgroundColorKey
  hasClothingImage: boolean
  hasBackgroundReference: boolean
  customWidthMm?: number
  customHeightMm?: number
  sourcePixelWidth?: number
  sourcePixelHeight?: number
}

export function PromptEditor({
  value,
  onChange,
  sizeKey,
  backgroundColorKey,
  hasClothingImage,
  hasBackgroundReference,
  customWidthMm,
  customHeightMm,
  sourcePixelWidth,
  sourcePixelHeight,
}: PromptEditorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const defaultPrompt = getDefaultPromptWithParams(
    sizeKey,
    backgroundColorKey,
    hasClothingImage,
    hasBackgroundReference,
    sizeKey === "custom" ? customWidthMm : undefined,
    sizeKey === "custom" ? customHeightMm : undefined,
    sizeKey === "originalAspect" ? sourcePixelWidth : undefined,
    sizeKey === "originalAspect" ? sourcePixelHeight : undefined
  )

  const handleReset = () => {
    onChange("")
  }

  const isCustomized = value !== "" && value !== defaultPrompt

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
          <span className="text-sm font-medium text-foreground">
            高级文字要求
            {isCustomized && (
              <span className="ml-2 text-xs text-primary">(已自定义)</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3">
        <Textarea
          value={value || defaultPrompt}
          onChange={(e) => onChange(e.target.value)}
          placeholder="输入自定义文字要求..."
          className="min-h-[200px] resize-none text-sm"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            文字要求会根据尺寸、背景色与是否上传参考图自动调整
          </p>
          {isCustomized && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-1 h-3 w-3" />
              恢复默认
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
