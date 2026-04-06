"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { AlertCircle, KeyRound, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { PhotoUpload } from "@/components/id-photo/photo-upload"
import { SizeSelector } from "@/components/id-photo/size-selector"
import { BackgroundSelector } from "@/components/id-photo/background-selector"
import { PromptEditor } from "@/components/id-photo/prompt-editor"
import { PreviewPanel } from "@/components/id-photo/preview-panel"
import { ActionButtons } from "@/components/id-photo/action-buttons"
import { HistoryPanel } from "@/components/id-photo/history-panel"
import { ApiUsageBadge } from "@/components/id-photo/api-usage-badge"
import { MyAccountDialog } from "@/components/user/my-account-dialog"
import { GuestLimitDialog } from "@/components/guest/guest-limit-dialog"
import { usePhotoGenerator } from "@/hooks/use-photo-generator"
import { useHistory } from "@/hooks/use-history"
import { DEFAULT_BACKGROUND_COLOR } from "@/lib/background-colors"
import { resolvePhotoSize } from "@/lib/photo-sizes"
import { readImageNaturalSize } from "@/lib/read-image-natural-size"
import type { PhotoSizeKey, BackgroundColorKey, AppMainTab } from "@/lib/photo-types"
import { VintageRestorePanel } from "@/components/vintage/vintage-restore-panel"
import {
  isGuestSession,
  guestQuotaExceeded,
  incrementGuestUsageIfGuest,
  getGuestRemainingCount,
  GUEST_TRIAL_LIMIT,
} from "@/lib/client-ark-settings"

export function AppMain() {
  const router = useRouter()
  const [myOpen, setMyOpen] = useState(false)
  const [guestLimitOpen, setGuestLimitOpen] = useState(false)
  const [guestUiTick, setGuestUiTick] = useState(0)
  const [mainTab, setMainTab] = useState<AppMainTab>("idPhoto")
  const [mainImage, setMainImage] = useState<string | null>(null)
  const [clothingImage, setClothingImage] = useState<string | null>(null)
  const [customBackgroundImage, setCustomBackgroundImage] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)

  const [sizeKey, setSizeKey] = useState<PhotoSizeKey>("1inch")
  const [customWidthMm, setCustomWidthMm] = useState(25)
  const [customHeightMm, setCustomHeightMm] = useState(35)
  const [backgroundColorKey, setBackgroundColorKey] = useState<BackgroundColorKey>(
    DEFAULT_BACKGROUND_COLOR
  )
  const [customPrompt, setCustomPrompt] = useState("")
  const [mainImageNatural, setMainImageNatural] = useState<{
    width: number
    height: number
  } | null>(null)

  const prevMainImageRef = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (
      prevMainImageRef.current !== undefined &&
      prevMainImageRef.current !== mainImage
    ) {
      setCustomPrompt("")
    }
    prevMainImageRef.current = mainImage
  }, [mainImage])

  useEffect(() => {
    if (!mainImage) {
      setMainImageNatural(null)
      return
    }
    let cancelled = false
    void readImageNaturalSize(mainImage).then(({ width, height }) => {
      if (!cancelled) setMainImageNatural({ width, height })
    })
    return () => {
      cancelled = true
    }
  }, [mainImage])

  const resolvedPhotoSize = useMemo(
    () =>
      resolvePhotoSize(
        sizeKey,
        sizeKey === "custom"
          ? { width: customWidthMm, height: customHeightMm }
          : null,
        sizeKey === "originalAspect" && mainImageNatural
          ? { width: mainImageNatural.width, height: mainImageNatural.height }
          : null
      ),
    [sizeKey, customWidthMm, customHeightMm, mainImageNatural]
  )

  const { records, apiUsage, addRecord, deleteRecord, clearAll, updateUsage } = useHistory()

  const { isGenerating, progress, elapsedSeconds, lastDurationMs, error, generate } =
    usePhotoGenerator({
    onSuccess: (imageUrl, usage, meta) => {
      incrementGuestUsageIfGuest()
      setGeneratedImage(imageUrl)
      addRecord({
        imageUrl,
        sizeKey,
        customWidthMm: sizeKey === "custom" ? customWidthMm : undefined,
        customHeightMm: sizeKey === "custom" ? customHeightMm : undefined,
        sourceWidthPx:
          sizeKey === "originalAspect"
            ? (meta?.submittedSourceWidth ?? mainImageNatural?.width)
            : undefined,
        sourceHeightPx:
          sizeKey === "originalAspect"
            ? (meta?.submittedSourceHeight ?? mainImageNatural?.height)
            : undefined,
        backgroundColorKey,
      })
      if (usage) {
        updateUsage(usage.input_tokens, usage.output_tokens)
      }
    },
  })

  const handleGenerate = useCallback(() => {
    if (guestQuotaExceeded()) {
      setGuestLimitOpen(true)
      return
    }
    if (!mainImage) return
    if (sizeKey === "originalAspect" && !mainImageNatural) return
    generate({
      image: mainImage,
      clothingImage,
      backgroundReferenceImage: customBackgroundImage,
      sizeKey,
      backgroundColorKey,
      customPrompt: customPrompt || undefined,
      customWidthMm: sizeKey === "custom" ? customWidthMm : undefined,
      customHeightMm: sizeKey === "custom" ? customHeightMm : undefined,
      sourceWidth: mainImageNatural?.width,
      sourceHeight: mainImageNatural?.height,
    })
  }, [
    mainImage,
    mainImageNatural,
    clothingImage,
    customBackgroundImage,
    sizeKey,
    customWidthMm,
    customHeightMm,
    backgroundColorKey,
    customPrompt,
    generate,
  ])

  const downloadBackgroundLabel = customBackgroundImage ? "自定义背景" : undefined

  const canGenerate =
    !!mainImage &&
    !isGenerating &&
    (sizeKey !== "originalAspect" || !!mainImageNatural)

  const clearVintageHistory = useCallback(() => {
    records.filter((r) => r.kind === "vintage").forEach((r) => deleteRecord(r.id))
  }, [records, deleteRecord])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex min-h-14 max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                className="h-8 w-8 shrink-0 object-contain"
                priority
              />
              <nav
                className="flex w-fit rounded-lg border border-border bg-muted/50 p-1"
                aria-label="功能切换"
              >
                <button
                  type="button"
                  onClick={() => setMainTab("idPhoto")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mainTab === "idPhoto"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  证件照处理
                </button>
                <button
                  type="button"
                  onClick={() => setMainTab("vintage")}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    mainTab === "vintage"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  旧照片处理
                </button>
              </nav>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isGuestSession() ? (
              <>
                <span className="text-xs text-muted-foreground tabular-nums">
                  访客体验 {getGuestRemainingCount()} / {GUEST_TRIAL_LIMIT} 次
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setMyOpen(true)}
                >
                  <KeyRound className="h-4 w-4" />
                  密钥
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setMyOpen(true)}
              >
                <User className="h-4 w-4" />
                我的
              </Button>
            )}
            <ApiUsageBadge usage={apiUsage} />
          </div>
        </div>
      </header>

      <MyAccountDialog
        open={myOpen}
        onOpenChange={setMyOpen}
        onLogout={() => router.replace("/login")}
        variant={isGuestSession() ? "guestCredentials" : "full"}
      />
      <GuestLimitDialog open={guestLimitOpen} onOpenChange={setGuestLimitOpen} />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {mainTab === "vintage" ? (
          <VintageRestorePanel
            onApiUsage={(input, output) => updateUsage(input, output)}
            records={records}
            onDeleteRecord={deleteRecord}
            onClearVintageHistory={clearVintageHistory}
            addRecord={addRecord}
            onGuestUsageConsumed={() => setGuestUiTick((t) => t + 1)}
            onGuestQuotaBlocked={() => setGuestLimitOpen(true)}
          />
        ) : (
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
                    label="生活照"
                    description="正面免冠照片，横版竖版均可"
                    value={mainImage}
                    onChange={setMainImage}
                    required
                    imageObjectFit="contain"
                  />
                  <div className="mt-4 border-t border-border pt-4">
                    <PhotoUpload
                      variant="compactReference"
                      label="服装参考"
                      description="可选，用于更换服装"
                      value={clothingImage}
                      onChange={setClothingImage}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <h2 className="mb-4 text-base font-medium text-foreground">参数设置</h2>
                  <div className="space-y-5">
                    <SizeSelector
                      value={sizeKey}
                      onChange={setSizeKey}
                      customWidthMm={customWidthMm}
                      customHeightMm={customHeightMm}
                      onCustomMmChange={(w, h) => {
                        setCustomWidthMm(w)
                        setCustomHeightMm(h)
                      }}
                    />
                    <BackgroundSelector
                      value={backgroundColorKey}
                      onChange={setBackgroundColorKey}
                      customBackgroundImage={customBackgroundImage}
                      onCustomBackgroundChange={setCustomBackgroundImage}
                    />
                    <PromptEditor
                      value={customPrompt}
                      onChange={setCustomPrompt}
                      sizeKey={sizeKey}
                      backgroundColorKey={backgroundColorKey}
                      hasClothingImage={!!clothingImage}
                      hasBackgroundReference={!!customBackgroundImage}
                      customWidthMm={customWidthMm}
                      customHeightMm={customHeightMm}
                      sourcePixelWidth={mainImageNatural?.width}
                      sourcePixelHeight={mainImageNatural?.height}
                    />
                  </div>
                </div>

                <div className="lg:hidden">
                  <ActionButtons
                    canGenerate={canGenerate}
                    isGenerating={isGenerating}
                    generatedImage={generatedImage}
                    sizeKey={sizeKey}
                    backgroundColorKey={backgroundColorKey}
                    downloadBackgroundLabel={downloadBackgroundLabel}
                    resolvedPhotoSize={resolvedPhotoSize}
                    onGenerate={handleGenerate}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-border bg-card p-5">
                  <PreviewPanel
                    generatedImage={generatedImage}
                    isGenerating={isGenerating}
                    progress={progress}
                    elapsedSeconds={elapsedSeconds}
                    lastDurationMs={lastDurationMs}
                    aspectWidthMm={resolvedPhotoSize.widthMm}
                    aspectHeightMm={resolvedPhotoSize.heightMm}
                  />
                </div>

                <div className="hidden lg:block">
                  <ActionButtons
                    canGenerate={canGenerate}
                    isGenerating={isGenerating}
                    generatedImage={generatedImage}
                    sizeKey={sizeKey}
                    backgroundColorKey={backgroundColorKey}
                    downloadBackgroundLabel={downloadBackgroundLabel}
                    resolvedPhotoSize={resolvedPhotoSize}
                    onGenerate={handleGenerate}
                  />
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                  <HistoryPanel
                    records={records}
                    onDelete={deleteRecord}
                    onClearAll={clearAll}
                    filterKind="idPhoto"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
