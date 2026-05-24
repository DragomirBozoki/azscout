import { useCallback, useEffect, useState } from "react"

import { apiFetch } from "@/lib/api"
import type { Subscription } from "@/types/api"

export function useSubscriptions() {
  const [data, setData] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const controller = new AbortController()
    setIsLoading(true)
    setError(null)

    try {
      const rows = await apiFetch<Subscription[]>("/subscriptions", { signal: controller.signal })
      setData(rows)
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message)
      }
    } finally {
      setIsLoading(false)
    }

    return () => controller.abort()
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { data, isLoading, error, reload: load }
}
