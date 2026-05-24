from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Scan(Base):
    __tablename__ = "scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    subscription_id: Mapped[str] = mapped_column(String(64), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(16), index=True)
    trigger: Mapped[str] = mapped_column(String(16))
    cost_window_days: Mapped[int] = mapped_column(Integer)
    metric_window_days: Mapped[int] = mapped_column(Integer)
    resource_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    critical_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    warn_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimated_waste: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    resources: Mapped[list["ResourceSnapshot"]] = relationship(back_populates="scan", cascade="all, delete-orphan")


class ResourceSnapshot(Base):
    __tablename__ = "resource_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    scan_id: Mapped[str] = mapped_column(String(36), ForeignKey("scans.id", ondelete="CASCADE"), index=True)
    resource_id: Mapped[str] = mapped_column(Text, index=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(128), index=True)
    location: Mapped[str] = mapped_column(String(64))
    resource_group: Mapped[str] = mapped_column(String(128), index=True)
    sku: Mapped[str] = mapped_column(String(128))
    kind: Mapped[str] = mapped_column(String(128), default="")
    cost: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    active_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    active_label: Mapped[str] = mapped_column(String(64))
    status: Mapped[str] = mapped_column(String(16), index=True)
    reason: Mapped[str] = mapped_column(Text)

    scan: Mapped[Scan] = relationship(back_populates="resources")


Index("ix_resource_history", ResourceSnapshot.resource_id, ResourceSnapshot.scan_id.desc())
Index("ix_scan_status_cost", ResourceSnapshot.scan_id, ResourceSnapshot.status, ResourceSnapshot.cost.desc())


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    azure_subscription_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_scan_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_scan_status: Mapped[str | None] = mapped_column(String(16), nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
