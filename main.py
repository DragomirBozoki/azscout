#!/usr/bin/env python3
"""
azscout_poc.py - Azure cost vs usage scoreboard MVP.

Generates an HTML report showing which resources cost the most relative
to how much they were actually used in the last N days.

Quick start:
    az login
    pip install -r requirements.txt
    python azscout_poc.py --subscription <SUBSCRIPTION_ID> --output report.html

For non-interactive auth, set these env vars instead of az login:
    AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET

Required RBAC on the subscription:
    Reader + Cost Management Reader + Monitoring Reader
"""

import argparse
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Optional

from azure.core.exceptions import HttpResponseError
from azure.identity import DefaultAzureCredential
from azure.mgmt.costmanagement import CostManagementClient
from azure.mgmt.resourcegraph import ResourceGraphClient
from azure.mgmt.resourcegraph.models import QueryRequest
from azure.monitor.query import MetricsQueryClient, MetricAggregationType
from jinja2 import Template


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Resource:
    id: str
    name: str
    type: str
    location: str
    resource_group: str
    sku: str
    properties: dict = field(default_factory=dict)
    cost: Decimal = Decimal("0")
    active_hours: Optional[float] = None   # None == we did not measure
    active_label: str = "—"
    status: str = "unknown"                # critical | warn | ok | unknown
    reason: str = ""

    @property
    def cost_per_active_hour(self) -> Optional[float]:
        """Returns None if not measured, raises sentinel via active_hours == 0."""
        if self.active_hours is None:
            return None
        if self.active_hours == 0:
            return None  # template renders infinity glyph based on active_hours==0
        return float(self.cost) / self.active_hours


# ---------------------------------------------------------------------------
# Collectors
# ---------------------------------------------------------------------------

INVENTORY_KQL = """
Resources
| where type in (
    'microsoft.compute/virtualmachines',
    'microsoft.compute/disks',
    'microsoft.network/publicipaddresses',
    'microsoft.web/serverfarms',
    'microsoft.sql/servers/databases',
    'microsoft.storage/storageaccounts'
  )
| project
    id,
    name,
    type,
    location,
    resourceGroup,
    sku = tostring(sku.name),
    properties
"""


def collect_inventory(credential, subscription_id: str) -> list[Resource]:
    """Pull all relevant resources via Azure Resource Graph."""
    client = ResourceGraphClient(credential)
    request = QueryRequest(
        subscriptions=[subscription_id],
        query=INVENTORY_KQL,
    )
    response = client.resources(request)

    resources = []
    for row in response.data or []:
        resources.append(Resource(
            id=row["id"],
            name=row["name"],
            type=row["type"],
            location=row.get("location") or "",
            resource_group=row.get("resourceGroup") or "",
            sku=row.get("sku") or "",
            properties=row.get("properties") or {},
        ))
    return resources


def collect_costs(credential, subscription_id: str, days: int) -> dict[str, Decimal]:
    """Return mapping of lowercased resource_id -> total cost over the window."""
    client = CostManagementClient(credential)
    scope = f"/subscriptions/{subscription_id}"

    end = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start = end - timedelta(days=days)

    params = {
        "type": "ActualCost",
        "timeframe": "Custom",
        "timePeriod": {
            "from": start.isoformat(),
            "to": end.isoformat(),
        },
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {"name": "Cost", "function": "Sum"},
            },
            "grouping": [
                {"type": "Dimension", "name": "ResourceId"},
            ],
        },
    }

    try:
        result = client.query.usage(scope=scope, parameters=params)
    except HttpResponseError as e:
        print(f"    -> WARNING: Cost API failed ({e.status_code}), continuing without cost data", file=sys.stderr)
        return {}

    col_names = [c.name.lower() for c in (result.columns or [])]
    try:
        cost_idx = col_names.index("cost")
    except ValueError:
        cost_idx = 0
    try:
        rid_idx = col_names.index("resourceid")
    except ValueError:
        rid_idx = 1

    costs: dict[str, Decimal] = {}
    for row in result.rows or []:
        try:
            cost = Decimal(str(row[cost_idx]))
            rid = str(row[rid_idx]).lower()
            costs[rid] = costs.get(rid, Decimal("0")) + cost
        except (IndexError, ValueError, TypeError):
            continue
    return costs


def collect_vm_activity(
    credential,
    vm_ids: list[str],
    days: int = 14,
    cpu_threshold: float = 5.0,
) -> dict[str, Optional[float]]:
    """
    For each VM, return the number of hours (avg CPU > threshold) in the window.
    None means we could not measure (e.g. permissions, deallocated entire window).
    """
    client = MetricsQueryClient(credential)
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)

    activity: dict[str, Optional[float]] = {}
    for vm_id in vm_ids:
        try:
            response = client.query_resource(
                resource_uri=vm_id,
                metric_names=["Percentage CPU"],
                timespan=(start, end),
                granularity=timedelta(hours=1),
                aggregations=[MetricAggregationType.AVERAGE],
            )
            active = 0
            for metric in response.metrics:
                for ts in metric.timeseries:
                    for dp in ts.data:
                        if dp.average is not None and dp.average > cpu_threshold:
                            active += 1
            activity[vm_id.lower()] = float(active)
        except HttpResponseError:
            activity[vm_id.lower()] = None
    return activity


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

CRIT_COST_THRESHOLD = Decimal("10")    # ignore peanuts below this
CRIT_ACTIVE_HOURS_MAX = 1.0            # less than 1 active hour in window = critical if expensive
WARN_UTILIZATION_RATIO = 0.20          # below 20% of window = underused


def score_resources(resources: list[Resource], metric_window_days: int) -> None:
    """Mutates resources: sets active_label, status, reason."""
    expected_hours = metric_window_days * 24

    for r in resources:
        t = r.type

        if t == "microsoft.compute/virtualmachines":
            # Stopped but not deallocated is the worst offender
            power = str(
                r.properties.get("extended", {})
                .get("instanceView", {})
                .get("powerState", {})
                .get("displayStatus", "")
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
                r.reason = f"Cost €{float(r.cost):.0f} but only {int(r.active_hours)} h CPU activity"
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

        else:
            # storage, sql, app service: inventory + cost only for this POC
            r.active_label = "—"
            r.status = "unknown"


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

REPORT_TEMPLATE = """<!doctype html>
<html lang="sr">
<head>
<meta charset="utf-8">
<title>AzScout report - {{ subscription_id }}</title>
<style>
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 32px; background: #f7f7f5; color: #1a1a1a; }
.wrap { max-width: 1180px; margin: 0 auto; }
h1 { font-size: 22px; font-weight: 500; margin: 0 0 4px; }
.sub { font-size: 13px; color: #666; margin-bottom: 24px; }
.metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
.metric { background: #fff; border-radius: 10px; padding: 14px 16px; border: 0.5px solid #e6e4dc; }
.metric-l { font-size: 12px; color: #777; }
.metric-v { font-size: 22px; font-weight: 500; margin-top: 4px; font-variant-numeric: tabular-nums; }
.metric-v.bad { color: #A32D2D; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; border: 0.5px solid #e6e4dc; font-size: 13px; }
th { text-align: left; padding: 12px 14px; font-weight: 500; color: #777; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 0.5px solid #e6e4dc; background: #fafaf7; }
th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
td { padding: 12px 14px; border-bottom: 0.5px solid #f0eee6; }
tr.row-critical { background: rgba(226, 75, 74, 0.06); }
tr.row-warn { background: rgba(239, 159, 39, 0.05); }
.name { font-weight: 500; }
.sub-name { font-size: 11px; color: #888; margin-top: 2px; }
.pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 500; }
.p-critical { background: #FCEBEB; color: #791F1F; }
.p-warn { background: #FAEEDA; color: #633806; }
.p-ok { background: #EAF3DE; color: #27500A; }
.p-unknown { background: #f0eee6; color: #555; }
.infinity { color: #A32D2D; font-weight: 500; font-size: 14px; }
.reason { color: #666; font-size: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Cost vs usage scoreboard</h1>
  <div class="sub">Subscription: {{ subscription_id }} &middot; cost window: last {{ cost_days }} days &middot; metric window: last {{ metric_days }} days &middot; generated: {{ generated_at }}</div>

  <div class="metrics">
    <div class="metric"><div class="metric-l">Total cost (window)</div><div class="metric-v">€{{ "%.0f"|format(total_cost) }}</div></div>
    <div class="metric"><div class="metric-l">Flagged critical</div><div class="metric-v bad">{{ critical_count }}</div></div>
    <div class="metric"><div class="metric-l">Estimated waste</div><div class="metric-v bad">€{{ "%.0f"|format(estimated_waste) }}</div></div>
    <div class="metric"><div class="metric-l">Resources tracked</div><div class="metric-v">{{ total_count }}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 28%">Resource</th>
        <th class="num" style="width: 11%">€ / window</th>
        <th class="num" style="width: 11%">Active</th>
        <th class="num" style="width: 12%">€ / active hour</th>
        <th style="width: 10%">Status</th>
        <th>Reason</th>
      </tr>
    </thead>
    <tbody>
      {% for r in rows %}
      <tr class="row-{{ r.status }}">
        <td>
          <div class="name">{{ r.name }}</div>
          <div class="sub-name">{{ r.type.split('/')[-1] }}{% if r.sku %} &middot; {{ r.sku }}{% endif %} &middot; {{ r.resource_group }}</div>
        </td>
        <td class="num">{{ "%.2f"|format(r.cost|float) }}</td>
        <td class="num">{{ r.active_label }}</td>
        <td class="num">
          {%- if r.active_hours == 0 -%}
            <span class="infinity">&infin;</span>
          {%- elif r.cost_per_active_hour is none -%}
            —
          {%- else -%}
            {{ "%.2f"|format(r.cost_per_active_hour) }}
          {%- endif -%}
        </td>
        <td><span class="pill p-{{ r.status }}">{{ r.status }}</span></td>
        <td class="reason">{{ r.reason }}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</div>
</body>
</html>
"""


def render_html(
    resources: list[Resource],
    subscription_id: str,
    cost_days: int,
    metric_days: int,
    output_path: str,
) -> None:
    status_order = {"critical": 0, "warn": 1, "unknown": 2, "ok": 3}
    sorted_rows = sorted(
        resources,
        key=lambda r: (status_order.get(r.status, 9), -float(r.cost)),
    )

    total_cost = sum((r.cost for r in resources), Decimal("0"))
    critical_count = sum(1 for r in resources if r.status == "critical")
    estimated_waste = sum(
        (r.cost for r in resources if r.status == "critical"),
        Decimal("0"),
    )

    html = Template(REPORT_TEMPLATE).render(
        subscription_id=subscription_id,
        cost_days=cost_days,
        metric_days=metric_days,
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        rows=sorted_rows,
        total_cost=float(total_cost),
        critical_count=critical_count,
        estimated_waste=float(estimated_waste),
        total_count=len(resources),
    )
    Path(output_path).write_text(html, encoding="utf-8")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="Azure cost vs usage scoreboard POC.")
    parser.add_argument("--subscription", required=True, help="Azure subscription ID (UUID)")
    parser.add_argument("--days", type=int, default=30, help="Cost window in days (default 30)")
    parser.add_argument("--metric-days", type=int, default=14, help="VM activity window in days (default 14)")
    parser.add_argument("--cpu-threshold", type=float, default=5.0, help="CPU %% above which a VM is considered active (default 5)")
    parser.add_argument("--output", default="report.html", help="Output HTML path")
    args = parser.parse_args()

    print("[*] Authenticating with DefaultAzureCredential", file=sys.stderr)
    credential = DefaultAzureCredential()

    print("[*] Collecting inventory via Resource Graph", file=sys.stderr)
    resources = collect_inventory(credential, args.subscription)
    print(f"    -> {len(resources)} resources", file=sys.stderr)

    print(f"[*] Collecting cost data (last {args.days} days)", file=sys.stderr)
    costs = collect_costs(credential, args.subscription, args.days)
    print(f"    -> cost rows for {len(costs)} resource IDs", file=sys.stderr)

    for r in resources:
        r.cost = costs.get(r.id.lower(), Decimal("0"))

    vm_ids = [r.id for r in resources if r.type == "microsoft.compute/virtualmachines"]
    if vm_ids:
        print(f"[*] Collecting VM activity ({len(vm_ids)} VMs, last {args.metric_days} days)", file=sys.stderr)
        activity = collect_vm_activity(credential, vm_ids, args.metric_days, args.cpu_threshold)
        for r in resources:
            if r.type == "microsoft.compute/virtualmachines":
                r.active_hours = activity.get(r.id.lower())

    print("[*] Scoring", file=sys.stderr)
    score_resources(resources, args.metric_days)

    print(f"[*] Writing report to {args.output}", file=sys.stderr)
    render_html(resources, args.subscription, args.days, args.metric_days, args.output)

    crit = sum(1 for r in resources if r.status == "critical")
    waste = sum((r.cost for r in resources if r.status == "critical"), Decimal("0"))
    print(f"\n[+] Done. {crit} critical findings, ~€{float(waste):.0f} estimated waste in window.", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())