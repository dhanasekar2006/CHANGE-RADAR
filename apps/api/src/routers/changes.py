from __future__ import annotations

import uuid

from fastapi import APIRouter, Query

from src.deps import CurrentUser, DbSession, Storage
from src.schemas.change import AcknowledgeChangeRequest, ChangeDetailOut, ChangeOut
from src.schemas.common import PagedResponse
from src.services import change_service, workspace_service

router = APIRouter(prefix="/workspaces/{workspace_id}/changes", tags=["changes"])


@router.get("", response_model=PagedResponse[ChangeOut])
async def list_changes(
    workspace_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
    monitor_id: uuid.UUID | None = None,
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0, ge=0),
) -> PagedResponse[ChangeOut]:
    await workspace_service.get_membership(db, workspace_id, current_user.id)
    changes, total = await change_service.list_changes(
        db, workspace_id, monitor_id=monitor_id, limit=limit, offset=offset
    )
    return PagedResponse(items=[ChangeOut.model_validate(c) for c in changes], total=total, limit=limit, offset=offset)


@router.get("/{change_id}", response_model=ChangeDetailOut)
async def get_change(
    workspace_id: uuid.UUID, change_id: uuid.UUID, current_user: CurrentUser, db: DbSession, storage: Storage
) -> ChangeDetailOut:
    await workspace_service.get_membership(db, workspace_id, current_user.id)
    change = await change_service.get_change(db, workspace_id, change_id)
    diff_payload = await change_service.get_diff_payload(change, storage)
    return ChangeDetailOut.model_validate({**ChangeOut.model_validate(change).model_dump(), "diff_payload": diff_payload})


@router.post("/{change_id}/acknowledge", response_model=ChangeOut)
async def acknowledge_change(
    workspace_id: uuid.UUID,
    change_id: uuid.UUID,
    payload: AcknowledgeChangeRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> ChangeOut:
    await workspace_service.get_membership(db, workspace_id, current_user.id)
    change = await change_service.get_change(db, workspace_id, change_id)
    change = await change_service.acknowledge(db, change, payload.acknowledged)
    return ChangeOut.model_validate(change)
