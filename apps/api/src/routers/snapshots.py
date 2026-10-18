from __future__ import annotations

import uuid

from fastapi import APIRouter

from src.deps import CurrentUser, DbSession, Storage
from src.schemas.snapshot import SnapshotDownloadOut, SnapshotOut
from src.services import snapshot_service, workspace_service

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["snapshots"])


@router.get("/monitors/{monitor_id}/snapshots", response_model=list[SnapshotOut])
async def list_snapshots(
    workspace_id: uuid.UUID, monitor_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> list[SnapshotOut]:
    await workspace_service.get_membership(db, workspace_id, current_user.id)
    snapshots = await snapshot_service.list_snapshots(db, workspace_id, monitor_id)
    return [SnapshotOut.model_validate(s) for s in snapshots]


@router.get("/snapshots/{snapshot_id}/download", response_model=SnapshotDownloadOut)
async def download_snapshot(
    workspace_id: uuid.UUID, snapshot_id: uuid.UUID, current_user: CurrentUser, db: DbSession, storage: Storage
) -> SnapshotDownloadOut:
    await workspace_service.get_membership(db, workspace_id, current_user.id)
    snapshot = await snapshot_service.get_snapshot(db, workspace_id, snapshot_id)
    expires_in = 3600
    url = snapshot_service.get_download_url(snapshot, storage, expires_in=expires_in)
    return SnapshotDownloadOut(download_url=url, expires_in=expires_in)
