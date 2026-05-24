from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class StatsOverview(BaseModel):
    last_scan_at: datetime | None
    resource_count: int
    total_cost: float
    critical_count: int
    warn_count: int
    ok_count: int
    unknown_count: int
    evaluated_count: int
    cost_available: bool
    metrics_available: bool

