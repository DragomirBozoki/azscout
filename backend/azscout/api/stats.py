from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, desc, func, select
from sqlalchemy.orm import Session

from azscout.db.models import ResourceSnapshot, Scan
from azscout.db.session import get_db
from azscout.schemas.stats import StatsOverview

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("/overview", response_model=StatsOverview)
def get_stats_overview(
    subscription_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> StatsOverview:
    latest_stmt = select(Scan).where(Scan.status == "completed")
    if subscription_id and subscription_id != "all":
        latest_stmt = latest_stmt.where(Scan.subscription_id == subscription_id)
    latest_scan = db.execute(latest_stmt.order_by(desc(Scan.completed_at)).limit(1)).scalar_one_or_none()

    if not latest_scan:
        return StatsOverview(
            last_scan_at=None,
            resource_count=0,
            total_cost=0.0,
            critical_count=0,
            warn_count=0,
            ok_count=0,
            unknown_count=0,
            evaluated_count=0,
            cost_available=False,
            metrics_available=False,
        )

    agg_stmt = select(
        func.count().label("resource_count"),
        func.coalesce(func.sum(ResourceSnapshot.cost), 0).label("total_cost"),
        func.sum(case((ResourceSnapshot.status == "critical", 1), else_=0)).label("critical_count"),
        func.sum(case((ResourceSnapshot.status == "warn", 1), else_=0)).label("warn_count"),
        func.sum(case((ResourceSnapshot.status == "ok", 1), else_=0)).label("ok_count"),
        func.sum(case((ResourceSnapshot.status == "unknown", 1), else_=0)).label("unknown_count"),
        func.sum(case((ResourceSnapshot.status != "unknown", 1), else_=0)).label("evaluated_count"),
    ).where(ResourceSnapshot.scan_id == latest_scan.id)
    agg = db.execute(agg_stmt).one()

    metrics_stmt = select(func.count()).where(
        ResourceSnapshot.scan_id == latest_scan.id,
        ResourceSnapshot.type == "microsoft.compute/virtualmachines",
        ResourceSnapshot.active_hours.is_not(None),
    )
    metrics_available = (db.execute(metrics_stmt).scalar_one() or 0) > 0

    total_cost_decimal = agg.total_cost if isinstance(agg.total_cost, Decimal) else Decimal(str(agg.total_cost or 0))
    total_cost = float(total_cost_decimal)

    return StatsOverview(
        last_scan_at=latest_scan.completed_at,
        resource_count=int(agg.resource_count or 0),
        total_cost=total_cost,
        critical_count=int(agg.critical_count or 0),
        warn_count=int(agg.warn_count or 0),
        ok_count=int(agg.ok_count or 0),
        unknown_count=int(agg.unknown_count or 0),
        evaluated_count=int(agg.evaluated_count or 0),
        cost_available=total_cost > 0,
        metrics_available=metrics_available,
    )
