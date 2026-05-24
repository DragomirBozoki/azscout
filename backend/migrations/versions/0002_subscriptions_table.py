from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002_subscriptions_table"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def _parse_env_subscriptions(raw: str) -> list[tuple[str, str]]:
    result: list[tuple[str, str]] = []
    for chunk in [v.strip() for v in raw.split(",") if v.strip()]:
        if ":" in chunk:
            sub_id, display_name = chunk.split(":", 1)
            result.append((sub_id.strip(), display_name.strip() or sub_id.strip()))
        else:
            result.append((chunk, chunk))
    return result


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("subscriptions"):
        op.create_table(
            "subscriptions",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("azure_subscription_id", sa.String(length=64), nullable=False),
            sa.Column("display_name", sa.String(length=255), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("created_by", sa.String(length=255), nullable=True),
            sa.Column("last_scan_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_scan_status", sa.String(length=16), nullable=True),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("azure_subscription_id", name="uq_subscriptions_azure_subscription_id"),
        )

    inspector = sa.inspect(bind)
    existing_indexes = {index["name"] for index in inspector.get_indexes("subscriptions")}
    if "ix_subscriptions_azure_subscription_id" not in existing_indexes:
        op.create_index("ix_subscriptions_azure_subscription_id", "subscriptions", ["azure_subscription_id"], unique=True)
    if "ix_subscriptions_created_at" not in existing_indexes:
        op.create_index("ix_subscriptions_created_at", "subscriptions", ["created_at"], unique=False)
    if "ix_subscriptions_enabled" not in existing_indexes:
        op.create_index("ix_subscriptions_enabled", "subscriptions", ["enabled"], unique=False)

    # Bootstrap seed path: only when table is empty and AZSCOUT_SUBSCRIPTIONS is provided.
    existing_count = bind.execute(sa.text("SELECT COUNT(*) FROM subscriptions")).scalar_one()
    raw_env = os.getenv("AZSCOUT_SUBSCRIPTIONS", "").strip()
    if existing_count == 0 and raw_env:
        rows = _parse_env_subscriptions(raw_env)
        for azure_subscription_id, display_name in rows:
            bind.execute(
                sa.text(
                    """
                    INSERT INTO subscriptions (
                        id,
                        azure_subscription_id,
                        display_name,
                        created_at,
                        created_by,
                        last_scan_at,
                        last_scan_status,
                        enabled
                    ) VALUES (
                        :id,
                        :azure_subscription_id,
                        :display_name,
                        :created_at,
                        NULL,
                        NULL,
                        NULL,
                        1
                    )
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "azure_subscription_id": azure_subscription_id,
                    "display_name": display_name,
                    "created_at": datetime.now(timezone.utc),
                },
            )


def downgrade() -> None:
    op.drop_index("ix_subscriptions_enabled", table_name="subscriptions")
    op.drop_index("ix_subscriptions_created_at", table_name="subscriptions")
    op.drop_index("ix_subscriptions_azure_subscription_id", table_name="subscriptions")
    op.drop_table("subscriptions")
