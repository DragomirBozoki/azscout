from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel


class ResourceSnapshotOut(BaseModel):
    id: int
    scan_id: str
    resource_id: str
    name: str
    type: str
    location: str
    resource_group: str
    sku: str
    kind: str
    cost: Decimal
    active_hours: float | None
    active_label: str
    status: str
    reason: str

    model_config = {"from_attributes": True}
