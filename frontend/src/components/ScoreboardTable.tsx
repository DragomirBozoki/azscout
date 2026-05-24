import { Link } from "react-router-dom"

import { ResourceIcon } from "@/components/ResourceIcon"
import { StatusPill } from "@/components/StatusPill"
import { formatCurrency, lastTypeSegment } from "@/lib/format"
import type { ResourceSnapshot } from "@/types/api"

export function ScoreboardTable({ rows, isLoading }: { rows: ResourceSnapshot[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-[10px] border-[0.5px] border-border bg-surface">
        <div className="grid grid-cols-1 gap-[0.5px] bg-border p-[0.5px]">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-[52px] bg-surface" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[10px] border-[0.5px] border-border bg-surface">
      <table className="w-full table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "40%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "11%" }} />
        </colgroup>
        <thead className="bg-surface-2">
          <tr className="border-b-[0.5px] border-border">
            <th className="upper-label px-[14px] py-[11px] text-left">Resource</th>
            <th className="upper-label px-[14px] py-[11px] text-right">€ / window</th>
            <th className="upper-label px-[14px] py-[11px] text-right">Active</th>
            <th className="upper-label px-[14px] py-[11px] text-right">€ / active hr</th>
            <th className="upper-label px-[14px] py-[11px] text-left">Status</th>
            <th className="upper-label px-[14px] py-[11px] text-left">Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const cost = Number(row.cost)
            const perHour = row.active_hours && row.active_hours > 0 ? cost / row.active_hours : null
            const rowTint = row.status === "critical" ? "var(--row-critical)" : row.status === "warn" ? "var(--row-warn)" : "transparent"
            const skuOrKind = row.sku || row.kind || "-"
            const subtitle = `${lastTypeSegment(row.type)} · ${skuOrKind} · ${row.resource_group}`

            return (
              <tr
                key={`${row.scan_id}-${row.id}`}
                className={idx === rows.length - 1 ? "" : "border-b-[0.5px] border-border"}
                style={{ background: rowTint }}
              >
                <td className="px-[14px] py-[13px]">
                  <div className="flex items-center gap-[10px]">
                    <ResourceIcon type={row.type} kind={row.kind} />
                    <div className="min-w-0 py-[1px]">
                      <Link to={`/resources/${encodeURIComponent(row.resource_id)}`} className="block truncate text-[14px] font-medium text-text-1">
                        {row.name}
                      </Link>
                      <div className="subtitle mt-[2px] truncate text-[12px] text-text-3">{subtitle}</div>
                    </div>
                  </div>
                </td>
                <td className="num px-[14px] py-[13px] text-right text-[14px]">{formatCurrency(cost)}</td>
                <td className="num px-[14px] py-[13px] text-right text-[14px]">{row.active_label || "—"}</td>
                <td className="num px-[14px] py-[13px] text-right text-[14px]">
                  {row.active_hours === 0 ? <span className="text-red-700">∞</span> : row.active_hours === null || perHour === null ? "—" : formatCurrency(perHour)}
                </td>
                <td className="px-[14px] py-[13px]"><StatusPill status={row.status} /></td>
                <td className="px-[14px] py-[13px] text-[12px] text-text-2">{row.reason}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
