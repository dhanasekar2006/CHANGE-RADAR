from __future__ import annotations

import uuid

from fastapi import APIRouter, status

from src.deps import CurrentUser, DbSession
from src.schemas.channel import ChannelCreate, ChannelOut, ChannelUpdate
from src.security.rbac import require_role
from src.services import channel_service, workspace_service
from packages.shared.constants import WorkspaceRole

router = APIRouter(prefix="/workspaces/{workspace_id}/channels", tags=["channels"])


@router.get("", response_model=list[ChannelOut])
async def list_channels(workspace_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> list[ChannelOut]:
    await workspace_service.get_membership(db, workspace_id, current_user.id)
    channels = await channel_service.list_channels(db, workspace_id)
    return [ChannelOut.model_validate(c) for c in channels]


@router.post("", response_model=ChannelOut, status_code=status.HTTP_201_CREATED)
async def create_channel(
    workspace_id: uuid.UUID, payload: ChannelCreate, current_user: CurrentUser, db: DbSession
) -> ChannelOut:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.ADMIN)
    channel = await channel_service.create_channel(db, workspace_id, payload)
    return ChannelOut.model_validate(channel)


@router.patch("/{channel_id}", response_model=ChannelOut)
async def update_channel(
    workspace_id: uuid.UUID,
    channel_id: uuid.UUID,
    payload: ChannelUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> ChannelOut:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.ADMIN)
    channel = await channel_service.get_channel(db, workspace_id, channel_id)
    channel = await channel_service.update_channel(db, channel, payload)
    return ChannelOut.model_validate(channel)


@router.delete("/{channel_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    workspace_id: uuid.UUID, channel_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> None:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.ADMIN)
    channel = await channel_service.get_channel(db, workspace_id, channel_id)
    await channel_service.delete_channel(db, channel)


@router.post("/{channel_id}/test", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def test_channel(
    workspace_id: uuid.UUID, channel_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> None:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.ADMIN)
    channel = await channel_service.get_channel(db, workspace_id, channel_id)
    await channel_service.send_test_notification(channel)
