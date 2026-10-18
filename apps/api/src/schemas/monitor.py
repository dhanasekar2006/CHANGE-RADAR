from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from src.schemas.common import TimestampedModel
from packages.shared.constants import (
    DEFAULT_CHECK_INTERVAL_SECONDS,
    MIN_CHECK_INTERVAL_SECONDS,
    ExtractorType,
    FetcherType,
    MonitorStatus,
)


class IgnoreRule(BaseModel):
    pattern: str
    type: str = Field(default="regex", pattern="^(regex|literal)$")


class MonitorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    url: str
    fetcher_type: FetcherType = FetcherType.HTTP
    extractor_type: ExtractorType = ExtractorType.CSS
    selector: str | None = None
    ignore_rules: list[IgnoreRule] = Field(default_factory=list)
    check_interval_seconds: int = Field(default=DEFAULT_CHECK_INTERVAL_SECONDS, ge=MIN_CHECK_INTERVAL_SECONDS)
    channel_ids: list[uuid.UUID] = Field(default_factory=list)


class MonitorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    url: str | None = None
    fetcher_type: FetcherType | None = None
    extractor_type: ExtractorType | None = None
    selector: str | None = None
    ignore_rules: list[IgnoreRule] | None = None
    check_interval_seconds: int | None = Field(default=None, ge=MIN_CHECK_INTERVAL_SECONDS)
    channel_ids: list[uuid.UUID] | None = None


class MonitorOut(TimestampedModel):
    workspace_id: uuid.UUID
    name: str
    url: str
    fetcher_type: FetcherType
    extractor_type: ExtractorType
    selector: str | None
    ignore_rules: list[dict]
    check_interval_seconds: int
    status: MonitorStatus
    last_checked_at: datetime | None
    next_check_at: datetime | None
    channel_ids: list[str]
