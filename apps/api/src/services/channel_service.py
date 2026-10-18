from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.channel import ChannelCreate, ChannelUpdate
from packages.core.models import Channel
from packages.core.notifiers import NOTIFIER_REGISTRY, NotificationPayload
from packages.shared.constants import ChangeSignificance
from packages.shared.errors import NotFoundError


async def list_channels(db: AsyncSession, workspace_id: uuid.UUID) -> list[Channel]:
    result = await db.scalars(select(Channel).where(Channel.workspace_id == workspace_id))
    return list(result)


async def get_channel(db: AsyncSession, workspace_id: uuid.UUID, channel_id: uuid.UUID) -> Channel:
    channel = await db.scalar(
        select(Channel).where(Channel.id == channel_id, Channel.workspace_id == workspace_id)
    )
    if channel is None:
        raise NotFoundError("channel not found")
    return channel


async def create_channel(db: AsyncSession, workspace_id: uuid.UUID, payload: ChannelCreate) -> Channel:
    channel = Channel(workspace_id=workspace_id, name=payload.name, type=payload.type, config=payload.config)
    db.add(channel)
    await db.commit()
    await db.refresh(channel)
    return channel


async def update_channel(db: AsyncSession, channel: Channel, payload: ChannelUpdate) -> Channel:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(channel, field, value)
    await db.commit()
    await db.refresh(channel)
    return channel


async def delete_channel(db: AsyncSession, channel: Channel) -> None:
    await db.delete(channel)
    await db.commit()


async def send_test_notification(channel: Channel) -> None:
    notifier_cls = NOTIFIER_REGISTRY[channel.type]
    notifier = notifier_cls(channel.config)
    await notifier.send(
        NotificationPayload(
            monitor_name="Test monitor",
            monitor_url="https://example.com",
            change_summary="This is a test notification from ChangeRadar.",
            significance=ChangeSignificance.MINOR,
            change_url="https://example.com/changes/test",
        )
    )
