from __future__ import annotations

import logging

from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select

from azscout.config import settings
from azscout.db.models import Scan, Subscription
from azscout.db.session import SessionLocal
from azscout.scanner.runner import run_scan

logger = logging.getLogger(__name__)

scheduler: BackgroundScheduler | None = None


def _run_scheduled_scan(subscription_id: str) -> None:
    run_scan(
        subscription_id=subscription_id,
        cost_window_days=settings.cost_window_days,
        metric_window_days=settings.metric_window_days,
        trigger="scheduled",
    )


def _enabled_subscription_ids() -> list[str]:
    with SessionLocal() as db:
        return list(
            db.execute(
                select(Subscription.azure_subscription_id).where(Subscription.enabled.is_(True))
            ).scalars()
        )


def reload_schedule() -> None:
    global scheduler
    if not scheduler:
        return

    for job in scheduler.get_jobs():
        if job.id.startswith("scan-"):
            scheduler.remove_job(job.id)

    sub_ids = _enabled_subscription_ids()
    if not sub_ids:
        logger.info("no subscriptions configured, waiting")
        return

    for sub_id in sub_ids:
        scheduler.add_job(
            _run_scheduled_scan,
            trigger="interval",
            hours=settings.scan_interval_hours,
            args=[sub_id],
            id=f"scan-{sub_id}",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        logger.info("scheduled scan for %s, next run in %sh", sub_id, settings.scan_interval_hours)


def start_scheduler() -> None:
    global scheduler
    if scheduler:
        return

    jobstores = {"default": SQLAlchemyJobStore(url=settings.database_url, tablename="apscheduler_jobs")}
    scheduler = BackgroundScheduler(jobstores=jobstores, timezone="UTC")
    scheduler.start()

    reload_schedule()

    with SessionLocal() as db:
        has_completed = db.execute(select(Scan.id).where(Scan.status == "completed").limit(1)).scalar_one_or_none()
    if not has_completed:
        sub_ids = _enabled_subscription_ids()
        if sub_ids:
            logger.info("no completed scans found; running initial scans now")
            for sub_id in sub_ids:
                try:
                    run_scan(sub_id, trigger="scheduled_initial")
                except Exception as exc:
                    logger.error(f"Initial scan for {sub_id} failed: {exc}", exc_info=True)


def stop_scheduler() -> None:
    global scheduler
    if scheduler:
        scheduler.shutdown(wait=False)
        scheduler = None
