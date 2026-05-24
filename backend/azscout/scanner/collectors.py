from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from azure.core.exceptions import HttpResponseError
from azure.mgmt.costmanagement import CostManagementClient
from azure.mgmt.resourcegraph import ResourceGraphClient
from azure.mgmt.resourcegraph.models import QueryRequest
from azure.monitor.query import MetricAggregationType, MetricsQueryClient

logger = logging.getLogger(__name__)


@dataclass
class Resource:
    id: str
    name: str
    type: str
    location: str
    resource_group: str
    sku: str
    kind: str = ""
    properties: dict = field(default_factory=dict)
    cost: Decimal = Decimal("0")
    active_hours: Optional[float] = None
    active_label: str = "—"
    status: str = "unknown"
    reason: str = ""

    @property
    def cost_per_active_hour(self) -> Optional[float]:
        if self.active_hours is None or self.active_hours == 0:
            return None
        return float(self.cost) / self.active_hours


INVENTORY_KQL = """Resources
| project id, name, type, location, resourceGroup, subscriptionId, skuName = tostring(sku.name), resourceKind = tostring(kind), properties
| limit 5000"""


def collect_inventory(credential, subscription_id: str) -> list[Resource]:
    client = ResourceGraphClient(credential)
    request = QueryRequest(subscriptions=[subscription_id], query=INVENTORY_KQL)
    response = client.resources(request)

    resources: list[Resource] = []
    for row in response.data or []:
        resources.append(
            Resource(
                id=row["id"],
                name=row["name"],
                type=row["type"],
                location=row.get("location") or "",
                resource_group=row.get("resourceGroup") or "",
                sku=row.get("skuName") or "",
                kind=row.get("resourceKind") or "",
                properties=row.get("properties") or {},
            )
        )

    if len(resources) >= 5000:
        logger.warning("Inventory hit the 5000 row cap; results may be truncated")
    else:
        logger.info(f"Inventory collected: {len(resources)} resources for {subscription_id}")

    return resources


def collect_costs(credential, subscription_id: str, days: int) -> tuple[dict[str, Decimal], str | None]:
    client = CostManagementClient(credential)
    scope = f"/subscriptions/{subscription_id}"

    end = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start = end - timedelta(days=days)

    params = {
        "type": "ActualCost",
        "timeframe": "Custom",
        "timePeriod": {"from": start.isoformat(), "to": end.isoformat()},
        "dataset": {
            "granularity": "None",
            "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
            "grouping": [{"type": "Dimension", "name": "ResourceId"}],
        },
    }

    try:
        result = client.query.usage(scope=scope, parameters=params)
    except HttpResponseError as e:
        if e.status_code in (401, 403):
            warning = f"Cost API unavailable (status {e.status_code}); continuing with zero cost data."
            logger.warning(warning)
            return {}, warning
        raise

    col_names = [c.name.lower() for c in (result.columns or [])]
    cost_idx = col_names.index("cost") if "cost" in col_names else 0
    rid_idx = col_names.index("resourceid") if "resourceid" in col_names else 1

    costs: dict[str, Decimal] = {}
    for row in result.rows or []:
        try:
            cost = Decimal(str(row[cost_idx]))
            rid = str(row[rid_idx]).lower()
            costs[rid] = costs.get(rid, Decimal("0")) + cost
        except (IndexError, ValueError, TypeError):
            continue
    return costs, None


def collect_vm_activity(
    credential, vm_ids: list[str], days: int = 14, cpu_threshold: float = 5.0
) -> dict[str, Optional[float]]:
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
