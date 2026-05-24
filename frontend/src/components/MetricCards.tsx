import type { ReactNode } from "react"

import { formatCurrency } from "@/lib/format"
import type { OverviewStats } from "@/types/api"

interface MetricCardsProps {
  stats: OverviewStats | null
  isLoading: boolean
}

function CardFrame({ children }: { children: ReactNode }) {
  return <div className="rounded-[10px] border-[0.5px] border-border bg-surface px-[14px] py-[12px]">{children}</div>
}

export function MetricCards({ stats, isLoading }: MetricCardsProps) {
  if (isLoading) {
    return (
      <div className="mb-[18px] grid grid-cols-2 gap-[10px] md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <CardFrame key={idx}>
            <div className="mb-[8px] h-[11px] w-[90px] rounded-[6px] bg-surface-2" />
            <div className="h-[28px] w-[120px] rounded-[6px] bg-surface-2" />
            <div className="mt-[7px] h-[11px] w-[90px] rounded-[6px] bg-surface-2" />
          </CardFrame>
        ))}
      </div>
    )
  }

  const resourceCount = stats?.resource_count ?? 0
  const evaluatedCount = stats?.evaluated_count ?? 0
  const percent = resourceCount > 0 ? Math.round((evaluatedCount / resourceCount) * 100) : 0
  const flagged = (stats?.critical_count ?? 0) + (stats?.warn_count ?? 0)

  return (
    <div className="mb-[18px] grid grid-cols-2 gap-[10px] md:grid-cols-4">
      <CardFrame>
        <div className="upper-label mb-[6px]">Total cost</div>
        <div className={`metric-value text-[22px] font-medium tracking-[-0.3px] ${stats?.cost_available ? "text-text-1" : "text-text-3"}`}>
          {stats?.cost_available ? `€${formatCurrency(stats?.total_cost ?? 0)}` : "€ —"}
        </div>
        <div className="mt-[3px]">
          {stats?.cost_available ? (
            <span className="text-[11px] text-text-3">30-day window</span>
          ) : (
            <span className="inline-flex rounded-[3px] bg-amber-50 px-[6px] py-[1px] text-[11px] font-medium tracking-[0.2px] text-amber-700">
              cost role pending
            </span>
          )}
        </div>
      </CardFrame>

      <CardFrame>
        <div className="upper-label mb-[6px]">Tracked</div>
        <div className="metric-value text-[22px] font-medium tracking-[-0.3px] text-text-1">{resourceCount}</div>
        <div className="mt-[3px] text-[11px] text-text-3">resources monitored</div>
      </CardFrame>

      <CardFrame>
        <div className="upper-label mb-[6px]">Flagged</div>
        <div className="metric-value text-[22px] font-medium tracking-[-0.3px] text-text-1">{flagged}</div>
        <div className="mt-[3px] text-[11px] text-text-3">critical or warn</div>
      </CardFrame>

      <CardFrame>
        <div className="upper-label mb-[6px]">Coverage</div>
        <div className="metric-value text-[22px] font-medium tracking-[-0.3px] text-text-1">
          {evaluatedCount}
          <span className="ml-[1px] text-[14px] font-normal text-text-3">/{resourceCount}</span>
        </div>
        <div className="mt-[3px] text-[11px] text-text-3">{percent}% have activity data</div>
      </CardFrame>
    </div>
  )
}
