from __future__ import annotations

import uuid
from datetime import datetime, timezone

from azure.identity import DefaultAzureCredential
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from azscout.db.models import Subscription
from azscout.db.session import get_db
from azscout.schemas.subscription import (
    ConnectionTestOut,
    SubscriptionCreateRequest,
    SubscriptionCreateResponse,
    SubscriptionOut,
    SubscriptionPatchRequest,
)
from azscout.scanner.probe import probe_subscription
from azscout.scanner.runner import create_scan, execute_scan
from azscout.scheduler import reload_schedule

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


def _validate_subscription_id(value: str) -> str:
    try:
        parsed = uuid.UUID(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid subscription ID format") from exc
    return str(parsed)


@router.get("", response_model=list[SubscriptionOut])
def list_subscriptions(db: Session = Depends(get_db)) -> list[Subscription]:
    rows = db.execute(select(Subscription).order_by(Subscription.created_at.asc())).scalars().all()
    return list(rows)


@router.post("", response_model=SubscriptionCreateResponse, status_code=status.HTTP_201_CREATED)
def add_subscription(payload: SubscriptionCreateRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)) -> SubscriptionCreateResponse:
    azure_subscription_id = _validate_subscription_id(payload.azure_subscription_id)

    existing = db.execute(
        select(Subscription).where(Subscription.azure_subscription_id == azure_subscription_id)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Subscription already exists")

    credential = DefaultAzureCredential()
    test_result = probe_subscription(credential, azure_subscription_id)
    enabled = test_result["status"] in {"ok", "warning"}

    sub = Subscription(
        id=str(uuid.uuid4()),
        azure_subscription_id=azure_subscription_id,
        display_name=(payload.display_name or azure_subscription_id).strip(),
        created_at=datetime.now(timezone.utc),
        created_by=None,
        enabled=enabled,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    reload_schedule()

    if enabled:
        scan_id, _ = create_scan(
            subscription_id=azure_subscription_id,
            cost_window_days=30,
            metric_window_days=14,
            trigger="manual",
        )
        background_tasks.add_task(execute_scan, scan_id)

    return SubscriptionCreateResponse(
        **SubscriptionOut.model_validate(sub).model_dump(),
        connection_test=ConnectionTestOut(**test_result),
    )


@router.post("/{subscription_id}/test", response_model=ConnectionTestOut)
def test_subscription_connection(subscription_id: str, db: Session = Depends(get_db)) -> ConnectionTestOut:
    sub = db.get(Subscription, subscription_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    credential = DefaultAzureCredential()
    result = probe_subscription(credential, sub.azure_subscription_id)
    sub.enabled = result["status"] in {"ok", "warning"}
    db.commit()

    reload_schedule()
    return ConnectionTestOut(**result)


@router.patch("/{subscription_id}", response_model=SubscriptionOut)
def patch_subscription(subscription_id: str, payload: SubscriptionPatchRequest, db: Session = Depends(get_db)) -> Subscription:
    sub = db.get(Subscription, subscription_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if payload.display_name is not None:
        sub.display_name = payload.display_name.strip() or sub.azure_subscription_id
    if payload.enabled is not None:
        sub.enabled = payload.enabled

    db.commit()
    db.refresh(sub)
    reload_schedule()
    return sub


@router.delete("/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subscription(subscription_id: str, db: Session = Depends(get_db)) -> None:
    sub = db.get(Subscription, subscription_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    db.delete(sub)
    db.commit()
    reload_schedule()
    return None
