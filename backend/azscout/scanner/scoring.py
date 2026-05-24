from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from azscout.scanner.collectors import Resource

CRIT_COST_THRESHOLD = Decimal("10")
CRIT_ACTIVE_HOURS_MAX = 1.0
WARN_UTILIZATION_RATIO = 0.20


def _parse_time_created(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def score_resources(resources: list[Resource], metric_window_days: int) -> None:
    expected_hours = metric_window_days * 24

    for r in resources:
        t = r.type

        if t == "microsoft.compute/virtualmachines":
            power = str(
                r.properties.get("extended", {}).get("instanceView", {}).get("powerState", {}).get("displayStatus", "")
            ).lower()
            if "stopped" in power and "deallocated" not in power:
                r.active_label = "stopped"
                r.status = "critical"
                r.reason = "Stopped but not deallocated, still paying compute"
                continue

            if r.active_hours is None:
                r.active_label = "no data"
                r.status = "unknown"
                continue

            r.active_label = f"{int(r.active_hours)} h"
            if r.cost >= CRIT_COST_THRESHOLD and r.active_hours < CRIT_ACTIVE_HOURS_MAX:
                r.status = "critical"
                r.reason = f"Cost EUR{float(r.cost):.0f} but only {int(r.active_hours)} h CPU activity"
            elif r.active_hours / expected_hours < WARN_UTILIZATION_RATIO:
                r.status = "warn"
                util = r.active_hours / expected_hours * 100
                r.reason = f"Utilization ~{util:.0f}% over {metric_window_days} days"
            else:
                r.status = "ok"

        elif t == "microsoft.compute/disks":
            disk_state = r.properties.get("diskState", "")
            if disk_state == "Unattached":
                r.active_hours = 0.0
                r.active_label = "unattached"
                r.status = "critical" if r.cost > Decimal("1") else "warn"
                r.reason = "Managed disk not attached to any VM"
            else:
                r.active_label = disk_state.lower() or "attached"
                r.status = "ok"

        elif t == "microsoft.network/publicipaddresses":
            ipconf = r.properties.get("ipConfiguration")
            if ipconf is None:
                r.active_hours = 0.0
                r.active_label = "unattached"
                r.status = "critical"
                r.reason = "Public IP not attached"
            else:
                r.active_label = "attached"
                r.status = "ok"

        elif t == "microsoft.compute/snapshots":
            created_at = _parse_time_created(r.properties.get("timeCreated"))
            if created_at and created_at < datetime.now(timezone.utc) - timedelta(days=30):
                r.active_label = "stale snapshot"
                r.status = "warn"
                r.reason = "Snapshot is older than 30 days"
            else:
                r.active_label = "snapshot"
                r.status = "unknown"

        elif t == "microsoft.network/networkinterfaces":
            vm_ref = r.properties.get("virtualMachine")
            if not vm_ref:
                r.active_label = "orphaned nic"
                r.status = "warn"
                r.reason = "Network interface is not attached to a VM"
            else:
                r.active_label = "attached"
                r.status = "ok"

        elif t == "microsoft.web/sites":
            site_state = str(r.properties.get("state", "")).lower()
            if site_state == "stopped":
                r.active_label = "stopped"
                r.status = "critical"
                r.reason = "App Service app is stopped"
            else:
                r.active_label = site_state or "running"
                r.status = "ok"

        else:
            r.active_label = "-"
            r.status = "unknown"
