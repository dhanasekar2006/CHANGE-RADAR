from __future__ import annotations

import uuid

from pydantic import BaseModel

from src.schemas.common import TimestampedModel


class SnapshotOut(TimestampedModel):
    monitor_id: uuid.UUID
    run_id: uuid.UUID
    content_hash: str
    content_type: str
    size_bytes: int


class SnapshotDownloadOut(BaseModel):
    download_url: str
    expires_in: int
