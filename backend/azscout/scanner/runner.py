from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from azure.identity import DefaultAzureCredential
from sqlalchemy import select

from azscout.config import settings
from azscout.db.models import ResourceSnapshot, Scan, Subscription
from azscout.db.session import SessionLocal
from azscout.scanner.collectors import collect_costs, collect_inventory, collect_vm_activity
from azscout.scanner.scoring import score_resources


def create_scan(
    subscription_id: str,
    cost_window_days: int = 30,
    metric_window_days: int = 14,
    trigger: str = "manual",
) -> tuple[str, datetime]:
    scan_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        scan = Scan(
            id=scan_id,
            subscription_id=subscription_id,
            started_at=now,
            status="running",
            trigger=trigger,
            cost_window_days=cost_window_days,
            metric_window_days=metric_window_days,
        )
        db.add(scan)

        sub = db.execute(
            select(Subscription).where(Subscription.azure_subscription_id == subscription_id)
        ).scalar_one_or_none()
        if sub:
            sub.last_scan_at = now
            sub.last_scan_status = "running"

        db.commit()
    return scan_id, now


def execute_scan(scan_id: str) -> str:
    with SessionLocal() as db:
        scan = db.execute(select(Scan).where(Scan.id == scan_id)).scalar_one()
        subscription_id = scan.subscription_id
        cost_window_days = scan.cost_window_days
        metric_window_days = scan.metric_window_days

    credential = DefaultAzureCredential()
    warning_message: str | None = None
    try:
        resources = collect_inventory(credential, subscription_id)
        costs, warning_message = collect_costs(credential, subscription_id, cost_window_days)
        for r in resources:
            r.cost = costs.get(r.id.lower(), Decimal("0"))

        vm_ids = [r.id for r in resources if r.type == "microsoft.compute/virtualmachines"]
        if vm_ids:
            activity = collect_vm_activity(
                credential, vm_ids, metric_window_days, cpu_threshold=settings.cpu_threshold
            )
            for r in resources:
                if r.type == "microsoft.compute/virtualmachines":
                    r.active_hours = activity.get(r.id.lower())

        score_resources(resources, metric_window_days)

        status_order = {"critical": 0, "warn": 1, "unknown": 2, "ok": 3}
        resources_sorted = sorted(resources, key=lambda r: (status_order.get(r.status, 9), -float(r.cost)))
        snapshots = [
            ResourceSnapshot(
                scan_id=scan_id,
                resource_id=r.id,
                name=r.name,
                type=r.type,
                location=r.location,
                resource_group=r.resource_group,
                sku=r.sku,
                kind=r.kind,
                cost=r.cost,
                active_hours=r.active_hours,
                active_label=r.active_label,
                status=r.status,
                reason=r.reason,
            )
            for r in resources_sorted
        ]

        total_cost = sum((r.cost for r in resources), Decimal("0"))
        critical_count = sum(1 for r in resources if r.status == "critical")
        warn_count = sum(1 for r in resources if r.status == "warn")
        estimated_waste = sum((r.cost for r in resources if r.status == "critical"), Decimal("0"))

        with SessionLocal() as db:
            if snapshots:
                db.bulk_save_objects(snapshots)
            scan = db.execute(select(Scan).where(Scan.id == scan_id)).scalar_one()
            scan.completed_at = datetime.now(timezone.utc)
            scan.status = "completed"
            scan.resource_count = len(resources)
            scan.total_cost = total_cost
            scan.critical_count = critical_count
            scan.warn_count = warn_count
            scan.estimated_waste = estimated_waste
            scan.error_message = warning_message

            sub = db.execute(
                select(Subscription).where(Subscription.azure_subscription_id == subscription_id)
            ).scalar_one_or_none()
            if sub:
                sub.last_scan_at = scan.completed_at
                sub.last_scan_status = "completed"

            db.commit()

    except Exception as exc:
        with SessionLocal() as db:
            scan = db.execute(select(Scan).where(Scan.id == scan_id)).scalar_one()
            scan.completed_at = datetime.now(timezone.utc)
            scan.status = "failed"
            scan.error_message = str(exc)[:500]

            sub = db.execute(
                select(Subscription).where(Subscription.azure_subscription_id == subscription_id)
            ).scalar_one_or_none()
            if sub:
                sub.last_scan_at = scan.completed_at
                sub.last_scan_status = "failed"

            db.commit()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Scan {scan_id} failed: {exc}", exc_info=True)
        raise

    return scan_id


def run_scan(
    subscription_id: str,
    cost_window_days: int = 30,
    metric_window_days: int = 14,
    trigger: str = "manual",
) -> str:
    scan_id, _ = create_scan(subscription_id, cost_window_days, metric_window_days, trigger)
    return execute_scan(scan_id)
