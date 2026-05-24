import { useEffect, useMemo, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Link, useParams } from "react-router-dom"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { EmptyState } from "@/components/EmptyState"
import { Layout } from "@/components/Layout"
import { StatusPill } from "@/components/StatusPill"
import { apiFetch } from "@/lib/api"
import { formatCurrency } from "@/lib/format"
import type { ResourceHistoryPoint } from "@/types/api"

export default function ResourceDetail() {
  const { resource_id } = useParams<{ resource_id: string }>()
  const [history, setHistory] = useState<ResourceHistoryPoint[]>([])

  useEffect(() => {
    const controller = new AbortController()
    if (!resource_id) return
    apiFetch<ResourceHistoryPoint[]>(`/resources/${resource_id}/history`, { signal: controller.signal }).then(setHistory).catch(() => undefined)
    return () => controller.abort()
  }, [resource_id])

  const latest = history[0]
  const chartData = useMemo(
    () =>
      [...history].reverse().map((point, idx) => ({
        index: idx + 1,
        cost: Number(point.cost),
      })),
    [history]
  )

  return (
    <Layout>
      <Link to="/" className="mb-3 inline-flex items-center gap-1 text-[12px] text-text-2 hover:text-text-1">
        <ArrowLeft size={13} />
        Scoreboard
      </Link>
      {latest ? (
        <>
          <h1 className="text-[18px] font-medium tracking-[-0.2px]">{decodeURIComponent(resource_id ?? "")}</h1>
          <p className="subtitle mb-3 text-[12px] text-text-3">current snapshot</p>
          <div className="mb-3 grid grid-cols-4 gap-[10px] rounded-[10px] border-[0.5px] border-border bg-surface px-[15px] py-[13px]">
            <div><div className="upper-label mb-1">Cost</div><div className="metric-value text-[24px] font-medium">€{formatCurrency(Number(latest.cost))}</div></div>
            <div><div className="upper-label mb-1">Active</div><div className="metric-value text-[24px] font-medium">{latest.active_label}</div></div>
            <div><div className="upper-label mb-1">Status</div><StatusPill status={latest.status} /></div>
            <div><div className="upper-label mb-1">Reason</div><div className="text-[12px] text-text-2">{latest.reason}</div></div>
          </div>
          <div className="mb-3 rounded-[10px] border-[0.5px] border-border bg-surface p-3">
            <div className="mb-2 text-[14px] font-medium">cost over time</div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="index" tick={{ fontSize: 11, fill: "#8A8A82" }} stroke="rgba(20,20,16,0.08)" />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8A82" }} stroke="rgba(20,20,16,0.08)" />
                  <Tooltip />
                  <Line type="monotone" dataKey="cost" stroke="#0F6E56" strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <EmptyState message="No history for this resource yet." />
      )}
    </Layout>
  )
}
