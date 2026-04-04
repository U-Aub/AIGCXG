"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PhotoUploadProps {
  label: string
  description?: string
  value: string | null
  onChange: (value: string | null) => void
  accept?: string
  maxSizeMB?: number
  required?: boolean
  className?: string
  /** 与背景色块同尺寸的 48×48 上传入口 */
  variant?: "default" | "thumbnail" | "compactReference"
  /** 预览图填充方式，横版照片建议 contain 以完整显示 */
  imageObjectFit?: "cover" | "contain"
}

export function PhotoUpload({
  label,
  description,
  value,
  onChange,
  accept = "image/jpeg,image/png",
  maxSizeMB = 20,
  required = false,
  className,
  variant = "default",
  imageObjectFit = "cover",
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)

      // 检查文件类型
      if (!file.type.match(/^image\/(jpeg|png)$/)) {
        setError("仅支持 JPG 或 PNG 格式")
        return
      }

      // 检查文件大小
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`文件大小不能超过 ${maxSizeMB}MB`)
        return
      }

      // 转换为 base64
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        onChange(result)
      }
      reader.onerror = () => {
        setError("文件读取失败")
      }
      reader.readAsDataURL(file)
    },
    [maxSizeMB, onChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleClear = useCallback(() => {
    onChange(null)
    setError(null)
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }, [onChange])

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [])

  if (variant === "compactReference") {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-foreground">
            {label}
            {required && <span className="ml-0.5 text-destructive">*</span>}
          </label>
          {value && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 px-1.5 text-[10px]">
              <X className="mr-0.5 h-3 w-3" />
              清除
            </Button>
          )}
        </div>
        {description && <p className="text-[10px] text-muted-foreground">{description}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
        {value ? (
          <button
            type="button"
            onClick={handleClick}
            className="flex h-20 w-full max-w-[11rem] cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-muted p-1"
          >
            <img src={value} alt="" className="max-h-full max-w-full object-contain" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleClick}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "flex h-20 w-full max-w-[11rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
            )}
          >
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">点击上传</span>
          </button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  if (variant === "thumbnail") {
    return (
      <div className={cn("relative", className)}>
        <span className="sr-only">
          {label}
          {required && "（必填）"}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />
        {value ? (
          <div
            className="group relative h-12 w-12 cursor-pointer overflow-hidden rounded-lg border-2 border-border bg-muted"
            title={`${label}，点击更换`}
            onClick={handleClick}
          >
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-bl bg-background/90 text-foreground shadow-sm hover:bg-muted"
              aria-label="清除自定义背景"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            title={`${label}，JPG/PNG 最大 ${maxSizeMB}MB`}
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleClick()
              }
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={cn(
              "flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
            )}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        {error && <p className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
        {value && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 px-2 text-xs">
            <X className="mr-1 h-3 w-3" />
            清除
          </Button>
        )}
      </div>

      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        <div
          className="relative aspect-[3/4] w-full cursor-pointer overflow-hidden rounded-lg border border-border bg-muted"
          onClick={handleClick}
        >
          <img
            src={value}
            alt="预览"
            className={cn(
              "h-full w-full",
              imageObjectFit === "contain" ? "object-contain" : "object-cover"
            )}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
            <span className="text-sm text-white">点击更换</span>
          </div>
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            "flex aspect-[3/4] w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {isDragging ? (
              <Upload className="h-6 w-6 text-primary" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "释放以上传" : "点击或拖拽上传"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPG/PNG, 最大 {maxSizeMB}MB
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
