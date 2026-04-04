"use client"

import { useState, useEffect, useCallback } from "react"
import type { HistoryRecord, HistoryRecordInput, ApiUsage } from "@/lib/photo-types"
import {
  getHistory,
  addToHistory,
  removeFromHistory,
  clearHistory,
  getApiUsage,
  updateApiUsage,
  migrateLegacyHistoryToIndexedDB,
} from "@/lib/history-storage"

interface UseHistoryReturn {
  records: HistoryRecord[]
  apiUsage: ApiUsage
  addRecord: (record: HistoryRecordInput) => void
  deleteRecord: (id: string) => void
  clearAll: () => void
  updateUsage: (inputTokens: number, outputTokens: number) => void
}

export function useHistory(): UseHistoryReturn {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [apiUsage, setApiUsage] = useState<ApiUsage>({
    month: "",
    callCount: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  })

  // 初始化：迁移旧版大图 → IndexedDB 后刷新列表
  useEffect(() => {
    void migrateLegacyHistoryToIndexedDB().then(() => {
      setRecords(getHistory())
    })
    setApiUsage(getApiUsage())
  }, [])

  const addRecord = useCallback((record: HistoryRecordInput) => {
    void (async () => {
      await addToHistory(record)
      setRecords(getHistory())
    })()
  }, [])

  const deleteRecord = useCallback((id: string) => {
    removeFromHistory(id)
    setRecords(getHistory())
  }, [])

  const clearAll = useCallback(() => {
    void clearHistory().then(() => setRecords([]))
  }, [])

  const updateUsage = useCallback((inputTokens: number, outputTokens: number) => {
    const newUsage = updateApiUsage(inputTokens, outputTokens)
    setApiUsage(newUsage)
  }, [])

  return {
    records,
    apiUsage,
    addRecord,
    deleteRecord,
    clearAll,
    updateUsage,
  }
}
