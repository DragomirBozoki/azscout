from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0003_resource_kind"
down_revision = "0002_subscriptions_table"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("resource_snapshots", sa.Column("kind", sa.String(length=128), nullable=False, server_default=""))


def downgrade() -> None:
    op.drop_column("resource_snapshots", "kind")
