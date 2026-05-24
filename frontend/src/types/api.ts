export type ResourceStatus = "critical" | "warn" | "ok" | "unknown"
export type ScanStatus = "running" | "completed" | "failed"

export interface ResourceSnapshot {
  id: number
  scan_id: string
  resource_id: string
  name: string
  type: string
  location: string
  resource_group: string
  sku: string
  kind: string
  cost: string
  active_hours: number | null
  active_label: string
  status: ResourceStatus
  reason: string
}

export interface Scan {
  id: string
  subscription_id: string
  started_at: string
  completed_at: string | null
  status: ScanStatus
  trigger: "manual" | "scheduled"
  cost_window_days: number
  metric_window_days: number
  resource_count: number | null
  total_cost: string | null
  critical_count: number | null
  warn_count: number | null
  estimated_waste: string | null
  error_message: string | null
}

export interface LatestScanResponse {
  scan: Scan
  resources: ResourceSnapshot[]
}

export interface ScanTriggerRequest {
  subscription_id: string
  cost_window_days?: number
  metric_window_days?: number
}

export interface ScanTriggerResponse {
  scan_id: string
  status: "running"
  started_at: string
}

export type ConnectionTestStatus = "ok" | "warning" | "failed"

export interface ConnectionTest {
  status: ConnectionTestStatus
  message: string
  resource_count: number
}

export interface Subscription {
  id: string
  azure_subscription_id: string
  display_name: string
  enabled: boolean
  last_scan_at: string | null
  last_scan_status: "running" | "completed" | "failed" | null
  created_at: string
}

export interface SubscriptionCreateResponse extends Subscription {
  connection_test: ConnectionTest
}

export interface OverviewStats {
  last_scan_at: string | null
  resource_count: number
  total_cost: number
  critical_count: number
  warn_count: number
  ok_count: number
  unknown_count: number
  evaluated_count: number
  cost_available: boolean
  metrics_available: boolean
}

export interface ResourceHistoryPoint {
  scan_id: string
  started_at?: string
  completed_at?: string
  cost: string
  active_hours: number | null
  status: ResourceStatus
  reason: string
  active_label: string
}
