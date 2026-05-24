from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class ConnectionTestOut(BaseModel):
    status: str
    message: str
    resource_count: int = 0


class SubscriptionOut(BaseModel):
    id: str
    azure_subscription_id: str
    display_name: str
    enabled: bool
    last_scan_at: datetime | None
    last_scan_status: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionCreateRequest(BaseModel):
    azure_subscription_id: str
    display_name: str | None = None


class SubscriptionCreateResponse(SubscriptionOut):
    connection_test: ConnectionTestOut


class SubscriptionPatchRequest(BaseModel):
    display_name: str | None = None
    enabled: bool | None = None
