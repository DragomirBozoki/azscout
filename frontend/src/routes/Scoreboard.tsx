import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { EmptyState } from "@/components/EmptyState"
import { FilterBar, type GroupMode, type SortMode } from "@/components/FilterBar"
import { Header } from "@/components/Header"
import { InsightBanner } from "@/components/InsightBanner"
import { Layout } from "@/components/Layout"
import { MetricCards } from "@/components/MetricCards"
import { ScoreboardTable } from "@/components/ScoreboardTable"
import { formatCurrency, lastTypeSegment } from "@/lib/format"
import { useLatestScan } from "@/hooks/useLatestScan"
import { useStats } from "@/hooks/useStats"
import { useSubscriptions } from "@/hooks/useSubscriptions"
import { useTriggerScan } from "@/hooks/useTriggerScan"
import type { ResourceSnapshot, ResourceStatus } from "@/types/api"

const statusPriority: Record<ResourceStatus, number> = { critical: 0, warn: 1, unknown: 2, ok: 3 }
const PAGE_SIZE = 8
const SELECTED_SUB_KEY = "azscout.selected_subscription_id"

function sortResources(resources: ResourceSnapshot[], sort: SortMode): ResourceSnapshot[] {
  const next = [...resources]
  if (sort === "cost_desc") return next.sort((a, b) => Number(b.cost) - Number(a.cost))
  if (sort === "cost_per_hour_desc") {
    return next.sort((a, b) => {
      const aVal = a.active_hours === 0 && Number(a.cost) > 0 ? Number.POSITIVE_INFINITY : a.active_hours ? Number(a.cost) / a.active_hours : Number.NEGATIVE_INFINITY
      const bVal = b.active_hours === 0 && Number(b.cost) > 0 ? Number.POSITIVE_INFINITY : b.active_hours ? Number(b.cost) / b.active_hours : Number.NEGATIVE_INFINITY
      return bVal - aVal
    })
  }
  if (sort === "active_asc") {
    return next.sort((a, b) => {
      if (a.active_hours === null && b.active_hours === null) return 0
      if (a.active_hours === null) return 1
      if (b.active_hours === null) return -1
      return a.active_hours - b.active_hours
    })
  }

  return next.sort((a, b) => {
    const statusCompare = statusPriority[a.status] - statusPriority[b.status]
    if (statusCompare !== 0) return statusCompare
    return Number(b.cost) - Number(a.cost)
  })
}

function groupKey(resource: ResourceSnapshot, groupBy: GroupMode): string {
  if (groupBy === "resource_group") return resource.resource_group || "(no resource group)"
  if (groupBy === "service_type") return lastTypeSegment(resource.type)
  if (groupBy === "location") return resource.location || "(no location)"
  return "all"
}

export default function Scoreboard() {
  const { data: subscriptions } = useSubscriptions()
  const [activeSubscriptionId, setActiveSubscriptionId] = useState<string | null>(() => localStorage.getItem(SELECTED_SUB_KEY))
  const [activeStatuses, setActiveStatuses] = useState<ResourceStatus[]>([])
  const [sort, setSort] = useState<SortMode>("waste_desc")
  const [groupBy, setGroupBy] = useState<GroupMode>("none")
  const [page, setPage] = useState(1)
  const { triggerScan, isTriggering } = useTriggerScan()
  const initializedDefaultFilterRef = useRef(false)

  const selectedSubscription = useMemo(() => {
    const first = subscriptions[0] ?? null
    if (!activeSubscriptionId) return first
    return subscriptions.find((sub) => sub.id === activeSubscriptionId) ?? first
  }, [activeSubscriptionId, subscriptions])

  useEffect(() => {
    if (selectedSubscription?.id) {
      localStorage.setItem(SELECTED_SUB_KEY, selectedSubscription.id)
      setActiveSubscriptionId(selectedSubscription.id)
    }
  }, [selectedSubscription?.id])

  const subscriptionId = selectedSubscription?.azure_subscription_id ?? null
  const { data: latest, isLoading: latestLoading, load, previousCompletedAtRef } = useLatestScan(subscriptionId)
  const { data: stats, isLoading: statsLoading } = useStats(subscriptionId)

  const resources = latest?.resources ?? []
  const vmsWithoutMetrics = useMemo(
    () =>
      resources.filter(
        (resource) => resource.type.toLowerCase() === "microsoft.compute/virtualmachines" && resource.active_hours === null
      ).length,
    [resources]
  )

  const counts = useMemo(() => {
    const initial: Record<ResourceStatus, number> = { critical: 0, warn: 0, ok: 0, unknown: 0 }
    for (const resource of resources) initial[resource.status] += 1
    return initial
  }, [resources])

  useEffect(() => {
    initializedDefaultFilterRef.current = false
    setActiveStatuses([])
  }, [subscriptionId])

  useEffect(() => {
    if (initializedDefaultFilterRef.current) return
    if (!resources.length) return

    if ((counts.critical + counts.warn) > 0) {
      setActiveStatuses(["critical", "warn"])
    } else if (counts.ok > 0) {
      setActiveStatuses(["ok"])
    } else {
      setActiveStatuses(["unknown"])
    }
    initializedDefaultFilterRef.current = true
  }, [counts.critical, counts.ok, counts.unknown, counts.warn, resources.length])

  const filteredAndSorted = useMemo(() => {
    const filtered = resources.filter((resource) => activeStatuses.length === 0 || activeStatuses.includes(resource.status))
    return sortResources(filtered, sort)
  }, [activeStatuses, resources, sort])

  const grouped = useMemo(() => {
    if (groupBy === "none") return [] as Array<{ key: string; rows: ResourceSnapshot[]; totalCost: number }>
    const bucket = new Map<string, ResourceSnapshot[]>()
    for (const row of filteredAndSorted) {
      const key = groupKey(row, groupBy)
      const curr = bucket.get(key) ?? []
      curr.push(row)
      bucket.set(key, curr)
    }
    return Array.from(bucket.entries())
      .map(([key, rows]) => ({
        key,
        rows,
        totalCost: rows.reduce((sum, item) => sum + Number(item.cost), 0),
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
  }, [filteredAndSorted, groupBy])

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE))
  const pagedRows = filteredAndSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [activeStatuses, sort, subscriptionId, groupBy])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    if (latest || selectedSubscription?.last_scan_status !== "running") return
    let ticks = 0
    const interval = setInterval(async () => {
      ticks += 1
      await load()
      if (ticks >= 100) {
        clearInterval(interval)
        toast("Scan is taking longer than expected. Check server logs or the manage subscriptions page.")
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [latest, load, selectedSubscription?.last_scan_status])

  function toggleStatus(status: ResourceStatus) {
    setActiveStatuses((prev) => (prev.includes(status) ? prev.filter((value) => value !== status) : [...prev, status]))
  }

  async function handleRefresh() {
    if (!subscriptionId) return
    try {
      await triggerScan({ subscription_id: subscriptionId })
      toast("Scan started")
      const baseline = previousCompletedAtRef.current
      let ticks = 0
      const interval = setInterval(async () => {
        ticks += 1
        await load()
        const nextCompletedAt = previousCompletedAtRef.current
        if (nextCompletedAt && nextCompletedAt !== baseline) clearInterval(interval)
        if (ticks >= 30) {
          clearInterval(interval)
          toast("Scan timed out")
        }
      }, 3000)
    } catch {
      toast("Scan error")
    }
  }

  if (!subscriptions.length) {
    return (
      <Layout>
        <EmptyState message="No scans yet. Trigger one to see the scoreboard." />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-content">
        <Header
          subscriptions={subscriptions}
          selectedSubscriptionId={selectedSubscription?.id ?? null}
          onSelectSubscription={setActiveSubscriptionId}
          lastScanAt={stats?.last_scan_at ?? null}
          isRefreshing={isTriggering}
          onRefresh={handleRefresh}
          scanInProgress={selectedSubscription?.last_scan_status === "running"}
        />

        <MetricCards stats={stats} isLoading={statsLoading} />
        <InsightBanner stats={stats} subscriptionId={subscriptionId} vmsWithoutMetrics={vmsWithoutMetrics} />

        <FilterBar
          counts={counts}
          activeStatuses={activeStatuses}
          toggleStatus={toggleStatus}
          sort={sort}
          setSort={setSort}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
        />

        {latestLoading ? (
          <ScoreboardTable rows={[]} isLoading={true} />
        ) : !latest && selectedSubscription?.last_scan_status === "running" ? (
          <EmptyState message="First scan is running. Usually completes within 30 seconds for small subscriptions, longer for big ones." />
        ) : filteredAndSorted.length > 0 ? (
          groupBy === "none" ? (
            <>
              <ScoreboardTable rows={pagedRows} isLoading={false} />
              <div className="mt-3 flex items-center justify-end gap-1">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-[6px] border-[0.5px] border-border px-2 py-1 text-[12px] text-text-2" disabled={page === 1}>prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNo) => (
                  <button key={pageNo} type="button" onClick={() => setPage(pageNo)} className={`rounded-[6px] border-[0.5px] px-2 py-1 text-[12px] ${page === pageNo ? "border-teal-600 bg-teal-50 text-teal-800" : "border-border bg-surface text-text-2"}`}>{pageNo}</button>
                ))}
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-[6px] border-[0.5px] border-border px-2 py-1 text-[12px] text-text-2" disabled={page === totalPages}>next</button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {grouped.map((group) => (
                <details key={group.key} className="rounded-[10px] border-[0.5px] border-border bg-surface" open>
                  <summary className="flex cursor-pointer list-none items-center justify-between border-b-[0.5px] border-border bg-surface-2 px-[14px] py-[10px]">
                    <div className="text-[13px] font-medium text-text-1">{group.key}</div>
                    <div className="text-[12px] text-text-3">{group.rows.length} · {formatCurrency(group.totalCost)}</div>
                  </summary>
                  <ScoreboardTable rows={group.rows} isLoading={false} />
                </details>
              ))}
            </div>
          )
        ) : (
          <EmptyState message="No results for selected filters." />
        )}
      </div>
    </Layout>
  )
}
