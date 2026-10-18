from __future__ import annotations

import uuid

from pydantic import BaseModel, Field

from src.schemas.common import TimestampedModel
from packages.shared.constants import ChannelType


class ChannelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: ChannelType
    config: dict = Field(default_factory=dict)


class ChannelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    config: dict | None = None
    is_active: bool | None = None


class ChannelOut(TimestampedModel):
    workspace_id: uuid.UUID
    name: str
    type: ChannelType
    is_active: bool
    # config intentionally omitted: may contain secrets (webhook URLs, bot tokens)
