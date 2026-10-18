from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Snapshot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Metadata for one fetched version of a monitor's content.

    The raw payload lives in object storage (packages/core/storage); this
    row is the pointer plus enough metadata to diff and to serve downloads.
    """

    __tablename__ = "snapshots"

    monitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("monitors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("monitor_runs.id", ondelete="CASCADE"), nullable=False
    )

    storage_key: Mapped[str] = mapped_column(String(512), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False, default="text/html")
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    changes: Mapped[list["Change"]] = relationship(
        back_populates="new_snapshot", foreign_keys="Change.new_snapshot_id"
    )
