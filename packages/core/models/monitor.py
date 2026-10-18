from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from packages.shared.constants import (
    DEFAULT_CHECK_INTERVAL_SECONDS,
    ExtractorType,
    FetcherType,
    MonitorStatus,
)


class Monitor(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "monitors"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)

    fetcher_type: Mapped[FetcherType] = mapped_column(
        Enum(FetcherType, name="fetcher_type"), default=FetcherType.HTTP, nullable=False
    )
    extractor_type: Mapped[ExtractorType] = mapped_column(
        Enum(ExtractorType, name="extractor_type"), default=ExtractorType.CSS, nullable=False
    )
    selector: Mapped[str | None] = mapped_column(Text, nullable=True)
    ignore_rules: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    check_interval_seconds: Mapped[int] = mapped_column(
        Integer, default=DEFAULT_CHECK_INTERVAL_SECONDS, nullable=False
    )
    status: Mapped[MonitorStatus] = mapped_column(
        Enum(MonitorStatus, name="monitor_status"), default=MonitorStatus.ACTIVE, nullable=False
    )

    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_check_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    channel_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    runs: Mapped[list["MonitorRun"]] = relationship(
        back_populates="monitor", cascade="all, delete-orphan", order_by="desc(MonitorRun.created_at)"
    )


class MonitorRun(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One execution of check_monitor: fetch -> extract -> diff -> score -> notify."""

    __tablename__ = "monitor_runs"

    monitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("monitors.id", ondelete="CASCADE"), nullable=False, index=True
    )

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    success: Mapped[bool | None] = mapped_column(nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    monitor: Mapped["Monitor"] = relationship(back_populates="runs")
