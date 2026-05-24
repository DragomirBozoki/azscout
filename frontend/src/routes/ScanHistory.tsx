import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

import { Layout } from "@/components/Layout"
import { StatusPill } from "@/components/StatusPill"
import { apiFetch } from "@/lib/api"
import { formatCurrency } from "@/lib/format"
import type { Scan } from "@/types/api"

export default function ScanHistory() {
  const [rows, setRows] = useState<Scan[]>([])

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<Scan[]>("/scans?limit=50", { signal: controller.signal }).then(setRows).catch(() => undefined)
    return () => controller.abort()
  }, [])

  return (
    <Layout>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[18px] font-medium tracking-[-0.2px]">scan history</div>
          <div className="text-[12px] text-text-3">Recent scans across the selected subscription.</div>
        </div>
        <Link to="/" className="inline-flex items-center gap-1 rounded-[6px] border-[0.5px] border-border-strong px-3 py-[6px] text-[13px] text-text-1 hover:bg-surface-2">
          <ArrowLeft size={13} />
          Back to scoreboard
        </Link>
      </div>
      <div className="overflow-hidden rounded-[10px] border-[0.5px] border-border bg-surface">
        <table className="w-full border-collapse">
          <thead className="bg-surface-2">
            <tr className="border-b-[0.5px] border-border">
              <th className="upper-label px-[14px] py-[11px] text-left">Started</th>
              <th className="upper-label px-[14px] py-[11px] text-left">Status</th>
              <th className="upper-label px-[14px] py-[11px] text-left">Trigger</th>
              <th className="upper-label px-[14px] py-[11px] text-right">Resources</th>
              <th className="upper-label px-[14px] py-[11px] text-right">Critical</th>
              <th className="upper-label px-[14px] py-[11px] text-right">Total cost</th>
              <th className="upper-label px-[14px] py-[11px] text-right">Waste</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((scan, idx) => (
              <tr key={scan.id} className={idx === rows.length - 1 ? "" : "border-b-[0.5px] border-border"} onClick={() => console.log("scan", scan.id)}>
                <td className="subtitle px-[14px] py-[13px] text-[12px] text-text-2">{new Date(scan.started_at).toLocaleString()}</td>
                <td className="px-[14px] py-[13px]"><StatusPill status={scan.status} /></td>
                <td className="px-[14px] py-[13px] text-[14px] text-text-1">{scan.trigger}</td>
                <td className="num px-[14px] py-[13px] text-right">{scan.resource_count ?? 0}</td>
                <td className="num px-[14px] py-[13px] text-right">{scan.critical_count ?? 0}</td>
                <td className="num px-[14px] py-[13px] text-right">{formatCurrency(Number(scan.total_cost ?? 0))}</td>
                <td className="num px-[14px] py-[13px] text-right">{formatCurrency(Number(scan.estimated_waste ?? 0))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  )
}
