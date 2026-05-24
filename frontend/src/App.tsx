import { Navigate, Route, Routes } from "react-router-dom"

import Scoreboard from "@/routes/Scoreboard"
import ScanHistory from "@/routes/ScanHistory"
import ResourceDetail from "@/routes/ResourceDetail"
import Setup from "@/routes/Setup"
import ManageSubscriptions from "@/routes/ManageSubscriptions"
import { useSubscriptions } from "@/hooks/useSubscriptions"

export default function App() {
  const { data: subscriptions, isLoading } = useSubscriptions()

  if (isLoading) {
    return <div />
  }

  const hasSubscriptions = subscriptions.length > 0

  return (
    <Routes>
      {/* TODO: user auth here in Phase 4 */}
      <Route path="/setup" element={<Setup />} />
      <Route path="/subscriptions" element={hasSubscriptions ? <ManageSubscriptions /> : <Navigate to="/setup" replace />} />
      <Route path="/" element={hasSubscriptions ? <Scoreboard /> : <Navigate to="/setup" replace />} />
      <Route path="/scans" element={hasSubscriptions ? <ScanHistory /> : <Navigate to="/setup" replace />} />
      <Route path="/resources/:resource_id" element={hasSubscriptions ? <ResourceDetail /> : <Navigate to="/setup" replace />} />
      <Route path="*" element={<Navigate to={hasSubscriptions ? "/" : "/setup"} replace />} />
    </Routes>
  )
}
