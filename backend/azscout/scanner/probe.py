from __future__ import annotations

from azure.core.exceptions import HttpResponseError
from azure.mgmt.resourcegraph import ResourceGraphClient
from azure.mgmt.resourcegraph.models import QueryRequest


def probe_subscription(credential, azure_subscription_id: str) -> dict:
    """
    Returns dict with keys: status, message, resource_count.
    status is one of: 'ok', 'warning', 'failed'.
    """
    client = ResourceGraphClient(credential)
    try:
        response = client.resources(
            QueryRequest(subscriptions=[azure_subscription_id], query="Resources | limit 1")
        )
        rows = response.data or []
        total_records = int(getattr(response, "total_records", 0) or 0)
        if rows:
            return {
                "status": "ok",
                "message": "Connection verified, found resources",
                "resource_count": total_records if total_records > 0 else 1,
            }

        return {
            "status": "warning",
            "message": "Subscription is reachable but empty (or permissions hide all resources)",
            "resource_count": 0,
        }
    except HttpResponseError as exc:
        text = (str(exc) or "").lower()
        code = getattr(exc, "status_code", None)
        if code == 403 or "authorizationfailed" in text:
            return {
                "status": "failed",
                "message": "Permission denied. Make sure your account has Reader role on this subscription.",
                "resource_count": 0,
            }
        if code == 404 or "novalidsubscriptions" in text:
            return {
                "status": "failed",
                "message": "Subscription not found, or not accessible from this tenant. Check that your az login is in the correct tenant.",
                "resource_count": 0,
            }

        message = str(exc)[:300]
        return {"status": "failed", "message": message, "resource_count": 0}
    except Exception as exc:
        return {"status": "failed", "message": str(exc)[:300], "resource_count": 0}
