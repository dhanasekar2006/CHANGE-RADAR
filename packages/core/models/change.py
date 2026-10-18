from __future__ import annotations

import uuid

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from packages.shared.constants import ChangeSignificance, DiffType


class Change(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A detected diff between two consecutive snapshots of a monitor."""

    __tablename__ = "changes"

    monitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("monitors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    previous_snapshot_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("snapshots.id", ondelete="SET NULL"), nullable=True
    )
    new_snapshot_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False
    )

    diff_type: Mapped[DiffType] = mapped_column(Enum(DiffType, name="diff_type"), nullable=False)
    diff_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    diff_payload_key: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Object storage key for the full diff payload"
    )

    similarity_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    significance: Mapped[ChangeSignificance] = mapped_column(
        Enum(ChangeSignificance, name="change_significance"),
        default=ChangeSignificance.MINOR,
        nullable=False,
    )
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    new_snapshot: Mapped["Snapshot"] = relationship(back_populates="changes", foreign_keys=[new_snapshot_id])
