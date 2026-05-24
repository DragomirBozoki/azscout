import { useMemo, useState, type FormEvent } from "react"
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"
import type { ConnectionTest, SubscriptionCreateResponse } from "@/types/api"

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function Setup() {
  const navigate = useNavigate()
  const [subscriptionId, setSubscriptionId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [created, setCreated] = useState<SubscriptionCreateResponse | null>(null)
  const [testResult, setTestResult] = useState<ConnectionTest | null>(null)

  const isValid = uuidRegex.test(subscriptionId)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!isValid) return
    setIsSubmitting(true)

    try {
      const response = await apiFetch<SubscriptionCreateResponse>("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          azure_subscription_id: subscriptionId,
          display_name: displayName || undefined,
        }),
      })
      setCreated(response)
      setTestResult(response.connection_test)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function onRetryTest() {
    if (!created) return
    const result = await apiFetch<ConnectionTest>(`/subscriptions/${created.id}/test`, { method: "POST" })
    setTestResult(result)
  }

  async function onRemoveCreated() {
    if (!created) return
    await apiFetch<void>(`/subscriptions/${created.id}`, { method: "DELETE" })
    setCreated(null)
    setTestResult(null)
  }

  const panel = useMemo(() => {
    if (!testResult || !created) return null
    if (testResult.status === "ok") {
      return (
        <div className="rounded-[10px] border-[0.5px] border-border bg-[color-mix(in_srgb,var(--teal-50)_40%,var(--surface))] p-4">
          <CheckCircle2 className="mb-2 text-teal-600" size={24} />
          <h3 className="mb-1 text-[16px] font-medium">Connected</h3>
          <p className="mb-3 text-[13px] text-text-2">AzScout can read this subscription. A first scan is running in the background.</p>
          <Button variant="default" className="w-full" onClick={() => navigate("/")}>Continue to scoreboard</Button>
        </div>
      )
    }

    if (testResult.status === "warning") {
      return (
        <div className="rounded-[10px] border-[0.5px] border-border bg-[color-mix(in_srgb,var(--amber-50)_40%,var(--surface))] p-4">
          <AlertCircle className="mb-2 text-amber-700" size={24} />
          <h3 className="mb-1 text-[16px] font-medium">Connected, but the subscription looks empty</h3>
          <p className="mb-3 text-[13px] text-text-2">AzScout reached this subscription but found no resources. This can mean the subscription is empty or visibility is limited.</p>
          <div className="flex gap-2">
            <Button variant="default" className="flex-1" onClick={() => navigate("/")}>Continue anyway</Button>
            <Button variant="secondary" className="flex-1" onClick={onRemoveCreated}>Cancel</Button>
          </div>
        </div>
      )
    }

    return (
      <div className="rounded-[10px] border-[0.5px] border-border bg-[color-mix(in_srgb,var(--red-50)_40%,var(--surface))] p-4">
        <XCircle className="mb-2 text-red-700" size={24} />
        <h3 className="mb-1 text-[16px] font-medium">Couldn't reach this subscription</h3>
        <p className="mb-2 text-[13px] text-text-2">{testResult.message}</p>
        <p className="mb-3 text-[13px] text-text-2">Common fixes: run az login with the right account, check the ID, or get Reader role.</p>
        <div className="flex gap-2">
          <Button variant="default" className="flex-1" onClick={onRetryTest}>Try again</Button>
          <Button variant="secondary" className="flex-1" onClick={onRemoveCreated}>Remove subscription</Button>
        </div>
      </div>
    )
  }, [created, navigate, testResult])

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-[1180px] items-center justify-center px-4">
      <div className="w-full max-w-[520px] rounded-[10px] border-[0.5px] border-border bg-surface p-6">
        {!panel ? (
          <form onSubmit={onSubmit}>
            <div className="upper-label mb-[6px]">Welcome to AzScout</div>
            <h1 className="mb-4 text-[18px] font-medium tracking-[-0.2px]">Connect your first subscription</h1>
            <p className="mb-5 text-[14px] text-text-2">AzScout reads Azure resources, cost, and metrics from one or more subscriptions. To begin, paste the ID of a subscription you want to monitor. You can add more later.</p>

            <label className="upper-label mb-1 block">Subscription ID</label>
            <input className="mb-1 w-full rounded-[6px] border-[0.5px] border-border px-2 py-2 font-mono text-[14px]" placeholder="42fc4c05-7234-4f60-b55f-baebec291809" value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} />
            {!isValid && subscriptionId.length > 0 ? <p className="mb-3 text-[12px] text-red-700">Subscription ID must be a valid UUID.</p> : <div className="mb-4" />}

            <label className="upper-label mb-1 block">Display name (optional)</label>
            <input className="mb-4 w-full rounded-[6px] border-[0.5px] border-border px-2 py-2 text-[14px]" placeholder="Comtrade AI Sponsorship" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

            <p className="mb-4 text-[12px] text-text-3">Make sure you're logged in with Azure CLI (az login) on the host running AzScout, and your account has Reader role. Cost Management Reader + Monitoring Reader unlock all data.</p>

            <Button variant="default" className="w-full py-[10px] text-[14px] font-medium" type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? "Adding…" : "Add subscription"}
            </Button>
          </form>
        ) : panel}
      </div>
    </div>
  )
}

