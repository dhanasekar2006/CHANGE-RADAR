from __future__ import annotations

import uuid

from pydantic import BaseModel

from src.schemas.common import TimestampedModel
from packages.shared.constants import ChangeSignificance, DiffType


class ChangeOut(TimestampedModel):
    monitor_id: uuid.UUID
    previous_snapshot_id: uuid.UUID | None
    new_snapshot_id: uuid.UUID
    diff_type: DiffType
    diff_summary: str | None
    similarity_score: float | None
    significance: ChangeSignificance
    ai_summary: str | None
    acknowledged: bool
    notified: bool


class ChangeDetailOut(ChangeOut):
    diff_payload: str
    """Full diff content, resolved from object storage on demand."""


class AcknowledgeChangeRequest(BaseModel):
    acknowledged: bool = True
