from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TimestampedModel(ORMModel):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class Page(BaseModel):
    limit: int = 20
    offset: int = 0


class PagedResponse[T](BaseModel):
    items: list[T]
    total: int
    limit: int
    offset: int
