from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models import Monitor, Snapshot
from packages.core.storage import SnapshotStorage
from packages.shared.errors import NotFoundError


async def list_snapshots(db: AsyncSession, workspace_id: uuid.UUID, monitor_id: uuid.UUID) -> list[Snapshot]:
    result = await db.scalars(
        select(Snapshot)
        .join(Monitor)
        .where(Snapshot.monitor_id == monitor_id, Monitor.workspace_id == workspace_id)
        .order_by(Snapshot.created_at.desc())
    )
    return list(result)


async def get_snapshot(db: AsyncSession, workspace_id: uuid.UUID, snapshot_id: uuid.UUID) -> Snapshot:
    snapshot = await db.scalar(
        select(Snapshot).join(Monitor).where(Snapshot.id == snapshot_id, Monitor.workspace_id == workspace_id)
    )
    if snapshot is None:
        raise NotFoundError("snapshot not found")
    return snapshot


def get_download_url(snapshot: Snapshot, storage: SnapshotStorage, expires_in: int = 3600) -> str:
    return storage.presigned_url(snapshot.storage_key, expires_in=expires_in)
