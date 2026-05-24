import { useCallback, useEffect, useRef, useState } from "react"

import { apiFetch } from "@/lib/api"
import type { LatestScanResponse } from "@/types/api"

export function useLatestScan(subscriptionId: string | null) {
  const [data, setData] = useState<LatestScanResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const previousCompletedAtRef = useRef<string | null>(null)

  const load = useCallback(async () => {
    if (!subscriptionId) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    const controller = new AbortController()
    try {
      const latest = await apiFetch<LatestScanResponse>(
        `/scans/latest?subscription_id=${encodeURIComponent(subscriptionId)}`,
        { signal: controller.signal }
      )
      setData(latest)
      previousCompletedAtRef.current = latest.scan.completed_at
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }

    return () => controller.abort()
  }, [subscriptionId])

  useEffect(() => {
    void load()
  }, [load])

  return {
    data,
    isLoading,
    error,
    load,
    previousCompletedAtRef,
    setData,
  }
}
