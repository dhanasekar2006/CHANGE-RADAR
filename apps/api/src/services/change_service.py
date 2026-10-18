from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models import Change, Monitor
from packages.core.storage import SnapshotStorage
from packages.shared.errors import NotFoundError


async def list_changes(
    db: AsyncSession,
    workspace_id: uuid.UUID,
    *,
    monitor_id: uuid.UUID | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Change], int]:
    query = select(Change).join(Monitor).where(Monitor.workspace_id == workspace_id)
    if monitor_id is not None:
        query = query.where(Change.monitor_id == monitor_id)

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.scalars(query.order_by(Change.created_at.desc()).limit(limit).offset(offset))
    return list(result), total or 0


async def get_change(db: AsyncSession, workspace_id: uuid.UUID, change_id: uuid.UUID) -> Change:
    change = await db.scalar(
        select(Change).join(Monitor).where(Change.id == change_id, Monitor.workspace_id == workspace_id)
    )
    if change is None:
        raise NotFoundError("change not found")
    return change


async def get_diff_payload(change: Change, storage: SnapshotStorage) -> str:
    if not change.diff_payload_key:
        return ""
    return storage.get(change.diff_payload_key).decode("utf-8", errors="replace")


async def acknowledge(db: AsyncSession, change: Change, acknowledged: bool) -> Change:
    change.acknowledged = acknowledged
    await db.commit()
    await db.refresh(change)
    return change
