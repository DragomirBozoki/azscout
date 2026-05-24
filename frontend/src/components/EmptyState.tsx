import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

interface EmptyStateProps {
  message: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({ message, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="rounded-[10px] border-[0.5px] border-border bg-surface px-4 py-10 text-center">
      <p className="text-[14px] text-text-2">{message}</p>
      {actionLabel && actionHref ? (
        <Link
          to={actionHref}
          className="mt-3 inline-flex items-center gap-1 rounded-[6px] border-[0.5px] border-border-strong px-3 py-[6px] text-[13px] text-text-1 hover:bg-surface-2"
        >
          <ArrowLeft size={13} />
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}
