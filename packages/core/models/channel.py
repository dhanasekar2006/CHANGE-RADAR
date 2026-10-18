from __future__ import annotations

import uuid

from sqlalchemy import JSON, Boolean, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from packages.core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from packages.shared.constants import ChannelType


class Channel(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A configured notification destination (email, Slack, Discord, Telegram, webhook)."""

    __tablename__ = "channels"

    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False, index=True
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[ChannelType] = mapped_column(Enum(ChannelType, name="channel_type"), nullable=False)
    config: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict, comment="Type-specific config, e.g. webhook URL, Slack channel id"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
