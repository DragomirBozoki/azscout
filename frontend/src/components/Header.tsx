import { ChevronDown, History, RefreshCw } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatRelativeTime, truncateMid } from "@/lib/format"
import type { Subscription } from "@/types/api"

interface HeaderProps {
  subscriptions: Subscription[]
  selectedSubscriptionId: string | null
  onSelectSubscription: (id: string) => void
  lastScanAt: string | null
  isRefreshing: boolean
  onRefresh: () => void
  scanInProgress?: boolean
}

export function Header({
  subscriptions,
  selectedSubscriptionId,
  onSelectSubscription,
  lastScanAt,
  isRefreshing,
  onRefresh,
  scanInProgress = false,
}: HeaderProps) {
  const navigate = useNavigate()
  const selected = subscriptions.find((sub) => sub.id === selectedSubscriptionId) ?? subscriptions[0] ?? null

  return (
    <header className="mb-[16px] flex items-center justify-between border-b-[0.5px] border-border pb-[16px]">
      <div>
        <div className="flex items-center gap-[10px]">
          <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] bg-teal-600 text-[14px] font-medium text-white">A</div>
          <div className="text-[16px] font-medium tracking-[-0.1px] text-text-1">AzScout</div>
        </div>
        <div className="mt-[4px] flex items-center text-[12px] text-text-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-[6px] rounded-[4px] border-[0.5px] border-border bg-surface px-[8px] py-[2px] text-[12px] text-text-2"
              >
                <span className="h-[5px] w-[5px] rounded-full bg-teal-600" />
                <span className="max-w-[260px] truncate">{selected?.display_name ?? "Select subscription"}</span>
                <ChevronDown size={11} className="text-text-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[340px]">
              {subscriptions.map((sub) => {
                const dotClass = !sub.enabled
                  ? "bg-red-700"
                  : sub.last_scan_status === "completed"
                    ? "bg-teal-600"
                    : sub.last_scan_status === "running"
                      ? "bg-amber-700"
                      : sub.last_scan_status === "failed"
                        ? "bg-red-700"
                        : "bg-gray-700"

                return (
                  <DropdownMenuItem key={sub.id} onClick={() => onSelectSubscription(sub.id)} className="flex items-center gap-2">
                    <span className={`h-[6px] w-[6px] rounded-full ${dotClass}`} />
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-medium text-text-1">{sub.display_name}</div>
                      <div className="font-mono text-[11px] text-text-3">{truncateMid(sub.azure_subscription_id)}</div>
                    </div>
                  </DropdownMenuItem>
                )
              })}
              <div className="my-1 border-t-[0.5px] border-border" />
              <DropdownMenuItem onClick={() => navigate("/setup")}>+ Add subscription</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/subscriptions")}>Manage subscriptions</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="mx-[6px]">·</span>
          <span>last 30 days</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-[6px] text-[12px] text-text-2">
          <span className="h-[5px] w-[5px] rounded-full bg-teal-600" />
          <span>scanned {formatRelativeTime(lastScanAt)}</span>
          {scanInProgress ? (
            <span className="ml-1 inline-flex rounded-[4px] bg-amber-50 px-[7px] py-[1px] text-[11px] font-medium text-amber-700">scan in progress</span>
          ) : null}
        </div>

        <Link
          to="/scans"
          className="inline-flex items-center gap-[5px] rounded-[6px] border-[0.5px] border-border-strong px-[12px] py-[6px] text-[13px] text-text-1 hover:bg-surface-2"
        >
          <History size={13} />
          History
        </Link>

        <Button variant="default" onClick={onRefresh} disabled={isRefreshing || !selected}>
          <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Scanning…" : "Refresh"}
        </Button>
      </div>
    </header>
  )
}
