from __future__ import annotations

import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.workspace import MemberInvite, MemberRoleUpdate, WorkspaceCreate, WorkspaceUpdate
from packages.core.models import User, Workspace, WorkspaceMember
from packages.shared.constants import WorkspaceRole
from packages.shared.errors import NotFoundError

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(name: str) -> str:
    return _SLUG_RE.sub("-", name.lower()).strip("-") or "workspace"


async def get_membership(db: AsyncSession, workspace_id: uuid.UUID, user_id: uuid.UUID) -> WorkspaceMember:
    member = await db.scalar(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id
        )
    )
    if member is None:
        raise NotFoundError("workspace not found")
    return member


async def get_workspace(db: AsyncSession, workspace_id: uuid.UUID) -> Workspace:
    workspace = await db.get(Workspace, workspace_id)
    if workspace is None:
        raise NotFoundError("workspace not found")
    return workspace


async def list_workspaces(db: AsyncSession, user_id: uuid.UUID) -> list[Workspace]:
    result = await db.scalars(
        select(Workspace).join(WorkspaceMember).where(WorkspaceMember.user_id == user_id)
    )
    return list(result)


async def create_workspace(db: AsyncSession, user_id: uuid.UUID, payload: WorkspaceCreate) -> Workspace:
    workspace = Workspace(name=payload.name, slug=_slugify(payload.name))
    db.add(workspace)
    await db.flush()
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user_id, role=WorkspaceRole.OWNER))
    await db.commit()
    await db.refresh(workspace)
    return workspace


async def update_workspace(db: AsyncSession, workspace: Workspace, payload: WorkspaceUpdate) -> Workspace:
    workspace.name = payload.name
    await db.commit()
    await db.refresh(workspace)
    return workspace


async def invite_member(db: AsyncSession, workspace_id: uuid.UUID, payload: MemberInvite) -> WorkspaceMember:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None:
        raise NotFoundError(f"no user registered with email {payload.email}")

    member = WorkspaceMember(workspace_id=workspace_id, user_id=user.id, role=payload.role)
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


async def update_member_role(db: AsyncSession, member: WorkspaceMember, payload: MemberRoleUpdate) -> WorkspaceMember:
    member.role = payload.role
    await db.commit()
    await db.refresh(member)
    return member


async def remove_member(db: AsyncSession, member: WorkspaceMember) -> None:
    await db.delete(member)
    await db.commit()
