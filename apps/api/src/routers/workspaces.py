from __future__ import annotations

import uuid

from fastapi import APIRouter, status

from src.deps import CurrentUser, DbSession
from src.schemas.workspace import (
    MemberInvite,
    MemberOut,
    MemberRoleUpdate,
    WorkspaceCreate,
    WorkspaceOut,
    WorkspaceUpdate,
)
from src.security.rbac import require_role
from src.services import workspace_service
from packages.shared.constants import WorkspaceRole

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[WorkspaceOut])
async def list_workspaces(current_user: CurrentUser, db: DbSession) -> list[WorkspaceOut]:
    workspaces = await workspace_service.list_workspaces(db, current_user.id)
    return [WorkspaceOut.model_validate(w) for w in workspaces]


@router.post("", response_model=WorkspaceOut, status_code=status.HTTP_201_CREATED)
async def create_workspace(payload: WorkspaceCreate, current_user: CurrentUser, db: DbSession) -> WorkspaceOut:
    workspace = await workspace_service.create_workspace(db, current_user.id, payload)
    return WorkspaceOut.model_validate(workspace)


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
async def update_workspace(
    workspace_id: uuid.UUID, payload: WorkspaceUpdate, current_user: CurrentUser, db: DbSession
) -> WorkspaceOut:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.ADMIN)
    workspace = await workspace_service.get_workspace(db, workspace_id)
    workspace = await workspace_service.update_workspace(db, workspace, payload)
    return WorkspaceOut.model_validate(workspace)


@router.post("/{workspace_id}/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
async def invite_member(
    workspace_id: uuid.UUID, payload: MemberInvite, current_user: CurrentUser, db: DbSession
) -> MemberOut:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.ADMIN)
    new_member = await workspace_service.invite_member(db, workspace_id, payload)
    return MemberOut.model_validate(new_member)


@router.patch("/{workspace_id}/members/{member_id}", response_model=MemberOut)
async def update_member_role(
    workspace_id: uuid.UUID,
    member_id: uuid.UUID,
    payload: MemberRoleUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> MemberOut:
    caller = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(caller.role, WorkspaceRole.ADMIN)
    target = await workspace_service.get_membership(db, workspace_id, member_id)
    updated = await workspace_service.update_member_role(db, target, payload)
    return MemberOut.model_validate(updated)


@router.delete("/{workspace_id}/members/{member_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    workspace_id: uuid.UUID, member_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> None:
    caller = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(caller.role, WorkspaceRole.ADMIN)
    target = await workspace_service.get_membership(db, workspace_id, member_id)
    await workspace_service.remove_member(db, target)
