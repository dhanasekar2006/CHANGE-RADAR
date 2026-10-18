from __future__ import annotations

import uuid

from pydantic import BaseModel, EmailStr, Field

from src.schemas.common import TimestampedModel
from packages.shared.constants import WorkspaceRole


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class WorkspaceUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class WorkspaceOut(TimestampedModel):
    name: str
    slug: str


class MemberInvite(BaseModel):
    email: EmailStr
    role: WorkspaceRole = WorkspaceRole.MEMBER


class MemberRoleUpdate(BaseModel):
    role: WorkspaceRole


class MemberOut(TimestampedModel):
    user_id: uuid.UUID
    workspace_id: uuid.UUID
    role: WorkspaceRole
