import { useEffect, useState } from "react"
import { ArrowLeft, RefreshCw, Power, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Layout } from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { apiFetch } from "@/lib/api"
import { minutesAgo, truncateMid } from "@/lib/format"
import type { Subscription } from "@/types/api"

export default function ManageSubscriptions() {
  const [rows, setRows] = useState<Subscription[]>([])
  const [pendingDelete, setPendingDelete] = useState<Subscription | null>(null)

  async function load() {
    const subs = await apiFetch<Subscription[]>("/subscriptions")
    setRows(subs)
  }

  useEffect(() => {
    void load()
  }, [])

  async function testConnection(id: string) {
    await apiFetch(`/subscriptions/${id}/test`, { method: "POST" })
    toast("Connection test finished")
    await load()
  }

  async function toggleEnabled(sub: Subscription) {
    await apiFetch(`/subscriptions/${sub.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !sub.enabled }),
    })
    await load()
  }

  async function removeSubscription() {
    if (!pendingDelete) return
    await apiFetch(`/subscriptions/${pendingDelete.id}`, { method: "DELETE" })
    setPendingDelete(null)
    await load()
  }

  return (
    <Layout>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[18px] font-medium tracking-[-0.2px]">subscriptions</div>
          <div className="text-[12px] text-text-3">Manage connected subscriptions and scheduled scanning.</div>
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
              <th className="upper-label px-[14px] py-[11px] text-left">Display name</th>
              <th className="upper-label px-[14px] py-[11px] text-left">Subscription ID</th>
              <th className="upper-label px-[14px] py-[11px] text-left">Status</th>
              <th className="upper-label px-[14px] py-[11px] text-left">Last scan</th>
              <th className="upper-label px-[14px] py-[11px] text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((sub, idx) => {
              const status = !sub.enabled ? "Disabled" : sub.last_scan_status === "failed" ? "Failed" : sub.last_scan_status === "running" ? "Running" : sub.last_scan_status === "completed" ? "Connected" : "Warning"
              const statusClass = !sub.enabled ? "text-gray-700" : sub.last_scan_status === "failed" ? "text-red-700" : sub.last_scan_status === "running" ? "text-amber-700" : "text-teal-600"
              return (
                <tr key={sub.id} className={idx === rows.length - 1 ? "" : "border-b-[0.5px] border-border"}>
                  <td className="px-[14px] py-[13px] text-[14px]">{sub.display_name}</td>
                  <td className="px-[14px] py-[13px] font-mono text-[12px] text-text-2" onClick={() => { navigator.clipboard.writeText(sub.azure_subscription_id); toast("Copied") }}>{truncateMid(sub.azure_subscription_id)}</td>
                  <td className={`px-[14px] py-[13px] text-[12px] ${statusClass}`}>{status}</td>
                  <td className="px-[14px] py-[13px] text-[12px] text-text-2">{minutesAgo(sub.last_scan_at)}</td>
                  <td className="px-[14px] py-[13px]">
                    <div className="flex items-center gap-[6px]">
                      <button type="button" className="rounded-[6px] p-[6px] text-text-2 hover:text-text-1" onClick={() => testConnection(sub.id)}><RefreshCw size={14} /></button>
                      <button type="button" className="rounded-[6px] p-[6px] text-text-2 hover:text-text-1" onClick={() => toggleEnabled(sub)}><Power size={14} /></button>
                      <button type="button" className="rounded-[6px] p-[6px] text-text-2 hover:text-text-1" onClick={() => setPendingDelete(sub)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!pendingDelete} onOpenChange={() => setPendingDelete(null)}>
        <DialogContent>
          <p className="mb-3 text-[14px] text-text-1">Remove "{pendingDelete?.display_name}"? This stops scheduled scans for this subscription. Existing scan history is kept.</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <button className="rounded-[6px] border-[0.5px] border-red-700 bg-red-700 px-3 py-[6px] text-[13px] text-white" onClick={removeSubscription}>Remove</button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  )
}
