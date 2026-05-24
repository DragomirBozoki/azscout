from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from azscout.schemas.resource import ResourceSnapshotOut


class ScanCreateRequest(BaseModel):
    subscription_id: str
    cost_window_days: int = 30
    metric_window_days: int = 14


class ScanAcceptedResponse(BaseModel):
    scan_id: str
    status: str
    started_at: datetime


class ScanOut(BaseModel):
    id: str
    subscription_id: str
    started_at: datetime
    completed_at: datetime | None
    status: str
    trigger: str
    cost_window_days: int
    metric_window_days: int
    resource_count: int | None
    total_cost: Decimal | None
    critical_count: int | None
    warn_count: int | None
    estimated_waste: Decimal | None
    error_message: str | None

    model_config = {"from_attributes": True}


class LatestScanResponse(BaseModel):
    scan: ScanOut
    resources: list[ResourceSnapshotOut]
