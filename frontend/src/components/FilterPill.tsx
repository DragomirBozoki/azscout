import type { ResourceStatus } from "@/types/api"

const dotClass: Record<ResourceStatus, string> = {
  critical: "bg-red-700",
  warn: "bg-amber-700",
  ok: "bg-green-800",
  unknown: "bg-gray-700",
}

export function FilterPill({
  label,
  count,
  status,
  active,
  onClick,
}: {
  label: string
  count: number
  status: ResourceStatus
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-[6px] rounded-[6px] border-[0.5px] px-[9px] py-[4px] text-[12px] font-medium ${
        active ? "border-teal-600 bg-teal-50 text-teal-800" : "border-border bg-surface text-text-2"
      }`}
    >
      <span className={`h-[6px] w-[6px] rounded-full ${dotClass[status]}`} />
      <span>
        {label} {count}
      </span>
    </button>
  )
}
