import type { ResourceStatus } from "@/types/api"

const statusStyles: Record<ResourceStatus, string> = {
  critical: "bg-red-50 text-red-800",
  warn: "bg-amber-50 text-amber-700",
  ok: "bg-green-50 text-green-800",
  unknown: "bg-gray-50 text-gray-700",
}

export function StatusPill({ status }: { status: ResourceStatus | "running" | "completed" | "failed" }) {
  if (status === "running") {
    return <span className="inline-flex rounded-[4px] bg-gray-50 px-[9px] py-[2px] text-[12px] font-medium text-gray-700">running</span>
  }
  if (status === "completed") {
    return <span className="inline-flex rounded-[4px] bg-green-50 px-[9px] py-[2px] text-[12px] font-medium text-green-800">completed</span>
  }
  if (status === "failed") {
    return <span className="inline-flex rounded-[4px] bg-red-50 px-[9px] py-[2px] text-[12px] font-medium text-red-800">failed</span>
  }

  return <span className={`inline-flex rounded-[4px] px-[9px] py-[2px] text-[12px] font-medium ${statusStyles[status]}`}>{status}</span>
}
