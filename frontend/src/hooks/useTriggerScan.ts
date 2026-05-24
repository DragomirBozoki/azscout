import { useState } from "react"

import { apiFetch } from "@/lib/api"
import type { ScanTriggerRequest, ScanTriggerResponse } from "@/types/api"

export function useTriggerScan() {
  const [isTriggering, setIsTriggering] = useState(false)

  async function triggerScan(payload: ScanTriggerRequest): Promise<ScanTriggerResponse> {
    setIsTriggering(true)
    try {
      return await apiFetch<ScanTriggerResponse>("/scans", {
        method: "POST",
        body: JSON.stringify(payload),
      })
    } finally {
      setIsTriggering(false)
    }
  }

  return { triggerScan, isTriggering }
}
