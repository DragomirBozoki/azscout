import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"

import { FilterPill } from "@/components/FilterPill"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { ResourceStatus } from "@/types/api"

export type SortMode = "waste_desc" | "cost_desc" | "cost_per_hour_desc" | "active_asc"
export type GroupMode = "none" | "resource_group" | "service_type" | "location"

const labels: Record<ResourceStatus, string> = {
  critical: "Critical",
  warn: "Underused",
  ok: "Healthy",
  unknown: "Unknown",
}

function Trigger({ prefix, value }: { prefix: string; value: string }) {
  return (
    <Button variant="secondary" className="rounded-[6px] border-[0.5px] border-border px-[9px] py-[4px] text-[12px]">
      <span className="text-text-3">{prefix}</span>
      <span className="text-text-1">{value}</span>
      <ChevronDown size={11} className="ml-[2px]" />
    </Button>
  )
}

export function FilterBar({
  counts,
  activeStatuses,
  toggleStatus,
  sort,
  setSort,
  groupBy,
  setGroupBy,
}: {
  counts: Record<ResourceStatus, number>
  activeStatuses: ResourceStatus[]
  toggleStatus: (status: ResourceStatus) => void
  sort: SortMode
  setSort: (mode: SortMode) => void
  groupBy: GroupMode
  setGroupBy: (mode: GroupMode) => void
}) {
  const [openMenu, setOpenMenu] = useState<"group" | "sort" | null>(null)

  const sortLabel = useMemo(() => {
    if (sort === "waste_desc") return "Most wasteful"
    if (sort === "cost_desc") return "Cost (high to low)"
    if (sort === "cost_per_hour_desc") return "Cost per active hour"
    return "Least active"
  }, [sort])

  const groupLabel = useMemo(() => {
    if (groupBy === "none") return "none"
    if (groupBy === "resource_group") return "resource group"
    if (groupBy === "service_type") return "service type"
    return "location"
  }, [groupBy])

  return (
    <div className="mb-[10px] flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-[6px]">
          <span className="rounded-[6px] border-[0.5px] border-border bg-surface px-[9px] py-[4px] text-[12px] text-text-3">Filter</span>
          <div className="flex flex-wrap gap-[6px]">
            {(Object.keys(labels) as ResourceStatus[]).map((status) => (
              <FilterPill
                key={status}
                label={labels[status]}
                count={counts[status]}
                status={status}
                active={activeStatuses.includes(status)}
                onClick={() => toggleStatus(status)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-[6px]">
          <DropdownMenu
            open={openMenu === "group"}
            onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? "group" : openMenu === "group" ? null : openMenu)}
          >
            <DropdownMenuTrigger asChild>
              <Trigger prefix="Group:" value={groupLabel} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setGroupBy("none")}>none</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy("resource_group")}>resource group</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy("service_type")}>service type</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy("location")}>location</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu
            open={openMenu === "sort"}
            onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? "sort" : openMenu === "sort" ? null : openMenu)}
          >
            <DropdownMenuTrigger asChild>
              <Trigger prefix="Sort:" value={sortLabel} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSort("waste_desc")}>Most wasteful</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("cost_desc")}>Cost (high to low)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("cost_per_hour_desc")}>Cost per active hour</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("active_asc")}>Least active</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
