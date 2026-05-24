from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "scans",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("subscription_id", sa.String(length=64), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("trigger", sa.String(length=16), nullable=False),
        sa.Column("cost_window_days", sa.Integer(), nullable=False),
        sa.Column("metric_window_days", sa.Integer(), nullable=False),
        sa.Column("resource_count", sa.Integer(), nullable=True),
        sa.Column("total_cost", sa.Numeric(12, 2), nullable=True),
        sa.Column("critical_count", sa.Integer(), nullable=True),
        sa.Column("warn_count", sa.Integer(), nullable=True),
        sa.Column("estimated_waste", sa.Numeric(12, 2), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scans_started_at", "scans", ["started_at"], unique=False)
    op.create_index("ix_scans_status", "scans", ["status"], unique=False)
    op.create_index("ix_scans_subscription_id", "scans", ["subscription_id"], unique=False)

    op.create_table(
        "resource_snapshots",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("scan_id", sa.String(length=36), nullable=False),
        sa.Column("resource_id", sa.Text(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=128), nullable=False),
        sa.Column("location", sa.String(length=64), nullable=False),
        sa.Column("resource_group", sa.String(length=128), nullable=False),
        sa.Column("sku", sa.String(length=128), nullable=False),
        sa.Column("cost", sa.Numeric(12, 2), nullable=False),
        sa.Column("active_hours", sa.Float(), nullable=True),
        sa.Column("active_label", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["scan_id"], ["scans.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_resource_snapshots_resource_group", "resource_snapshots", ["resource_group"], unique=False)
    op.create_index("ix_resource_snapshots_resource_id", "resource_snapshots", ["resource_id"], unique=False)
    op.create_index("ix_resource_snapshots_scan_id", "resource_snapshots", ["scan_id"], unique=False)
    op.create_index("ix_resource_snapshots_status", "resource_snapshots", ["status"], unique=False)
    op.create_index("ix_resource_snapshots_type", "resource_snapshots", ["type"], unique=False)
    op.create_index(
        "ix_resource_history",
        "resource_snapshots",
        ["resource_id", "scan_id"],
        unique=False,
    )
    op.create_index(
        "ix_scan_status_cost",
        "resource_snapshots",
        ["scan_id", "status", "cost"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_scan_status_cost", table_name="resource_snapshots")
    op.drop_index("ix_resource_history", table_name="resource_snapshots")
    op.drop_index("ix_resource_snapshots_type", table_name="resource_snapshots")
    op.drop_index("ix_resource_snapshots_status", table_name="resource_snapshots")
    op.drop_index("ix_resource_snapshots_scan_id", table_name="resource_snapshots")
    op.drop_index("ix_resource_snapshots_resource_id", table_name="resource_snapshots")
    op.drop_index("ix_resource_snapshots_resource_group", table_name="resource_snapshots")
    op.drop_table("resource_snapshots")
    op.drop_index("ix_scans_subscription_id", table_name="scans")
    op.drop_index("ix_scans_status", table_name="scans")
    op.drop_index("ix_scans_started_at", table_name="scans")
    op.drop_table("scans")
