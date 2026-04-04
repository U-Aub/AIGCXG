"use client"

import { Activity } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApiUsage } from "@/lib/photo-types"
import { estimateCost } from "@/lib/history-storage"

interface ApiUsageBadgeProps {
  usage: ApiUsage
  className?: string
}

export function ApiUsageBadge({ usage, className }: ApiUsageBadgeProps) {
  const cost = estimateCost(usage)

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1",
        className
      )}
    >
      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        本月：{usage.callCount} 次调用
      </span>
      <span className="text-xs text-muted-foreground">|</span>
      <span className="text-xs text-muted-foreground">
        约 ${cost.toFixed(4)}
      </span>
    </div>
  )
}
