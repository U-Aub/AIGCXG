"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { GUEST_TRIAL_LIMIT } from "@/lib/client-ark-settings"

interface GuestLimitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GuestLimitDialog({ open, onOpenChange }: GuestLimitDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>体验次数已用完</AlertDialogTitle>
          <AlertDialogDescription>
            访客体验共可使用 {GUEST_TRIAL_LIMIT}{" "}
            次照片处理（证件照与旧照片修复合计）。请使用正式账号登录以继续使用完整功能。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            知道了
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
