from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from azscout.config import settings
from azscout.db.models import Subscription
from azscout.db.session import SessionLocal


def seed_subscriptions_from_env_if_empty() -> int:
    env_subs = settings.parsed_subscriptions
    if not env_subs:
        return 0

    with SessionLocal() as db:
        count = db.execute(select(Subscription.id).limit(1)).scalar_one_or_none()
        if count is not None:
            return 0

        rows = [
            Subscription(
                id=str(uuid.uuid4()),
                azure_subscription_id=sub.subscription_id,
                display_name=sub.display_name or sub.subscription_id,
                created_at=datetime.now(timezone.utc),
                created_by=None,
                enabled=True,
            )
            for sub in env_subs
        ]
        db.add_all(rows)
        db.commit()
        return len(rows)


def get_enabled_subscriptions() -> list[Subscription]:
    with SessionLocal() as db:
        return list(db.execute(select(Subscription).where(Subscription.enabled.is_(True))).scalars().all())
