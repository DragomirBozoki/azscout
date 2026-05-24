import { useEffect, useState } from "react"

import { apiFetch } from "@/lib/api"
import type { OverviewStats } from "@/types/api"

export function useStats(subscriptionId: string | null) {
  const [data, setData] = useState<OverviewStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    if (!subscriptionId) {
      setIsLoading(false)
      setData(null)
      return
    }

    setIsLoading(true)
    apiFetch<OverviewStats>(`/stats/overview?subscription_id=${encodeURIComponent(subscriptionId)}`, {
      signal: controller.signal,
    })
      .then(setData)
      .catch((err: Error) => {
        if (err.name !== "AbortError") {
          setError(err.message)
        }
      })
      .finally(() => setIsLoading(false))

    return () => controller.abort()
  }, [subscriptionId])

  return { data, isLoading, error }
}
