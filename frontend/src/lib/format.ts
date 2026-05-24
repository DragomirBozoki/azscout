function withSpaceGrouping(value: string): string {
  return value.replace(/\u00A0/g, " ")
}

export function formatCurrency(value: number, decimals = 2): string {
  const formatted = new Intl.NumberFormat("sr-RS", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
  return withSpaceGrouping(formatted)
}

export function formatHours(activeHours: number | null, label: string): string {
  if (activeHours === null) return "—"
  if (activeHours === 0) return "0"
  return label || `${Math.round(activeHours)} h`
}

export function minutesAgo(isoDate: string | null): string {
  if (!isoDate) return "n/a"
  const diffMs = Date.now() - new Date(isoDate).getTime()
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  return `${mins} min ago`
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "never"
  const then = new Date(iso).getTime()
  const now = Date.now()
  const seconds = Math.max(0, Math.floor((now - then) / 1000))

  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function lastTypeSegment(type: string): string {
  const segments = type.split("/")
  return segments[segments.length - 1] ?? type
}

export function truncateMid(value: string, left = 8, right = 5): string {
  if (value.length <= left + right + 1) return value
  return `${value.slice(0, left)}…${value.slice(-right)}`
}
