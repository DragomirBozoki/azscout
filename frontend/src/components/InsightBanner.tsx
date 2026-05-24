import { Copy, Info } from "lucide-react"
import { useMemo } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import type { OverviewStats } from "@/types/api"

interface InsightBannerProps {
  stats: OverviewStats | null
  subscriptionId: string | null
  vmsWithoutMetrics: number
}

function buildRoleCommands(subscriptionId: string | null) {
  const sub = subscriptionId ?? "{subscriptionId}"
  const upn = "{userPrincipalName}"
  return {
    cost: `az role assignment create --assignee ${upn} --role \"Cost Management Reader\" --scope /subscriptions/${sub}`,
    monitor: `az role assignment create --assignee ${upn} --role \"Monitoring Reader\" --scope /subscriptions/${sub}`,
  }
}

export function InsightBanner({ stats, subscriptionId, vmsWithoutMetrics }: InsightBannerProps) {
  const view = useMemo(() => {
    if (!stats || stats.resource_count === 0) return null

    if (!stats.cost_available) {
      return {
        headline: `${stats.unknown_count} resources are unevaluated`,
        body: " because cost and metrics roles are missing. Add Cost Management Reader and Monitoring Reader to unlock the full scoreboard.",
        kind: "cost_missing" as const,
      }
    }

    if (stats.cost_available && !stats.metrics_available) {
      return {
        headline: `${vmsWithoutMetrics} VMs have no activity data`,
        body: " because Monitoring Reader is missing. Idle VM detection is disabled until granted.",
        kind: "metrics_missing" as const,
      }
    }

    if (stats.unknown_count > stats.resource_count * 0.5) {
      return {
        headline: "Most of your inventory is unknown",
        body: " because no rules apply to these resource types yet. You can ignore it or request rules for specific types.",
        kind: "coverage_low" as const,
      }
    }

    return null
  }, [stats, vmsWithoutMetrics])

  if (!view || !stats) return null

  const commands = buildRoleCommands(subscriptionId)

  const missingText =
    view.kind === "cost_missing"
      ? "Cost and Monitoring roles are not fully detected."
      : view.kind === "metrics_missing"
        ? "Monitoring role is not detected for VM activity metrics."
        : "Roles seem present, but many resource types are not covered by current scoring rules."

  async function copyCommand(command: string) {
    await navigator.clipboard.writeText(command)
    toast("Copied")
  }

  return (
    <div className="mb-[14px] rounded-[8px] border-[0.5px] border-border bg-surface-2 px-[14px] py-[11px]">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <Info size={13} />
        </span>
        <p className="text-[13px] text-text-2">
          <span className="font-medium text-text-1">{view.headline}</span>
          {view.body}
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" className="ml-auto text-[12px] text-teal-600 hover:underline">
              Learn how →
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-[720px] rounded-[10px] border-[0.5px] border-border bg-surface p-4">
            <div className="mb-3 text-[16px] font-medium text-text-1">Unlock cost and activity data</div>

            <div className="space-y-4 text-[13px] text-text-2">
              <section>
                <div className="mb-1 text-[12px] font-medium text-text-1">What&apos;s missing</div>
                <p>{missingText}</p>
              </section>

              <section>
                <div className="mb-2 text-[12px] font-medium text-text-1">How to fix</div>
                <div className="space-y-2">
                  <div className="relative rounded-[6px] bg-surface-2 p-[8px] pr-[64px] font-mono text-[12px] text-text-1">
                    {commands.cost}
                    <button type="button" onClick={() => void copyCommand(commands.cost)} className="absolute right-[8px] top-[8px] inline-flex items-center gap-1 text-[12px] text-text-2 hover:text-text-1">
                      <Copy size={13} /> Copy
                    </button>
                  </div>
                  <div className="relative rounded-[6px] bg-surface-2 p-[8px] pr-[64px] font-mono text-[12px] text-text-1">
                    {commands.monitor}
                    <button type="button" onClick={() => void copyCommand(commands.monitor)} className="absolute right-[8px] top-[8px] inline-flex items-center gap-1 text-[12px] text-text-2 hover:text-text-1">
                      <Copy size={13} /> Copy
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-1 text-[12px] font-medium text-text-1">Who can grant this</div>
                <p>Ask an Owner or User Access Administrator on the subscription to run these commands.</p>
              </section>
            </div>

            <div className="mt-4 flex justify-end">
              <DialogClose asChild>
                <Button type="button" variant="secondary">Close</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
