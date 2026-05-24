from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import Select, desc, select
from sqlalchemy.orm import Session

from azscout.db.models import ResourceSnapshot, Scan
from azscout.db.session import get_db
from azscout.schemas.scan import LatestScanResponse, ScanAcceptedResponse, ScanCreateRequest, ScanOut
from azscout.scanner.runner import create_scan, execute_scan

router = APIRouter(prefix="/api/scans", tags=["scans"])
@router.post("", response_model=ScanAcceptedResponse, status_code=status.HTTP_202_ACCEPTED)
def trigger_scan(payload: ScanCreateRequest, background_tasks: BackgroundTasks) -> ScanAcceptedResponse:
    scan_id, started_at = create_scan(
        subscription_id=payload.subscription_id,
        cost_window_days=payload.cost_window_days,
        metric_window_days=payload.metric_window_days,
        trigger="manual",
    )
    background_tasks.add_task(execute_scan, scan_id)
    return ScanAcceptedResponse(scan_id=scan_id, status="running", started_at=started_at)


@router.get("", response_model=list[ScanOut])
def list_scans(
    limit: int = Query(default=20, ge=1, le=200),
    subscription_id: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[Scan]:
    stmt: Select[tuple[Scan]] = select(Scan)
    if subscription_id:
        stmt = stmt.where(Scan.subscription_id == subscription_id)
    if status_filter:
        stmt = stmt.where(Scan.status == status_filter)
    stmt = stmt.order_by(desc(Scan.started_at)).limit(limit)
    return list(db.execute(stmt).scalars().all())


@router.get("/latest", response_model=LatestScanResponse)
def get_latest_scan(subscription_id: str | None = None, db: Session = Depends(get_db)) -> LatestScanResponse:
    stmt = select(Scan).where(Scan.status == "completed")
    if subscription_id:
        stmt = stmt.where(Scan.subscription_id == subscription_id)
    scan = db.execute(stmt.order_by(desc(Scan.completed_at)).limit(1)).scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="No completed scan found")

    resources = list(db.execute(select(ResourceSnapshot).where(ResourceSnapshot.scan_id == scan.id)).scalars())
    status_order = {"critical": 0, "warn": 1, "unknown": 2, "ok": 3}
    resources.sort(key=lambda r: (status_order.get(r.status, 9), -float(r.cost)))
    return LatestScanResponse(scan=scan, resources=resources)


@router.get("/{scan_id}", response_model=ScanOut)
def get_scan(scan_id: str, db: Session = Depends(get_db)) -> Scan:
    scan = db.get(Scan, scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan
