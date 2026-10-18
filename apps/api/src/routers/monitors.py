from __future__ import annotations

import uuid

from fastapi import APIRouter, status

from src.deps import CurrentUser, DbSession
from src.schemas.monitor import MonitorCreate, MonitorOut, MonitorUpdate
from src.security.rbac import require_role
from src.services import monitor_service, workspace_service
from packages.shared.constants import MonitorStatus, WorkspaceRole

router = APIRouter(prefix="/workspaces/{workspace_id}/monitors", tags=["monitors"])


@router.get("", response_model=list[MonitorOut])
async def list_monitors(workspace_id: uuid.UUID, current_user: CurrentUser, db: DbSession) -> list[MonitorOut]:
    await workspace_service.get_membership(db, workspace_id, current_user.id)
    monitors = await monitor_service.list_monitors(db, workspace_id)
    return [MonitorOut.model_validate(m) for m in monitors]


@router.post("", response_model=MonitorOut, status_code=status.HTTP_201_CREATED)
async def create_monitor(
    workspace_id: uuid.UUID, payload: MonitorCreate, current_user: CurrentUser, db: DbSession
) -> MonitorOut:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.MEMBER)
    monitor = await monitor_service.create_monitor(db, workspace_id, current_user.id, payload)
    return MonitorOut.model_validate(monitor)


@router.get("/{monitor_id}", response_model=MonitorOut)
async def get_monitor(
    workspace_id: uuid.UUID, monitor_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> MonitorOut:
    await workspace_service.get_membership(db, workspace_id, current_user.id)
    monitor = await monitor_service.get_monitor(db, workspace_id, monitor_id)
    return MonitorOut.model_validate(monitor)


@router.patch("/{monitor_id}", response_model=MonitorOut)
async def update_monitor(
    workspace_id: uuid.UUID,
    monitor_id: uuid.UUID,
    payload: MonitorUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> MonitorOut:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.MEMBER)
    monitor = await monitor_service.get_monitor(db, workspace_id, monitor_id)
    monitor = await monitor_service.update_monitor(db, monitor, payload)
    return MonitorOut.model_validate(monitor)


@router.delete("/{monitor_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def delete_monitor(
    workspace_id: uuid.UUID, monitor_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> None:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.ADMIN)
    monitor = await monitor_service.get_monitor(db, workspace_id, monitor_id)
    await monitor_service.delete_monitor(db, monitor)


@router.post("/{monitor_id}/pause", response_model=MonitorOut)
async def pause_monitor(
    workspace_id: uuid.UUID, monitor_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> MonitorOut:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.MEMBER)
    monitor = await monitor_service.get_monitor(db, workspace_id, monitor_id)
    monitor = await monitor_service.set_status(db, monitor, MonitorStatus.PAUSED)
    return MonitorOut.model_validate(monitor)


@router.post("/{monitor_id}/resume", response_model=MonitorOut)
async def resume_monitor(
    workspace_id: uuid.UUID, monitor_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> MonitorOut:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.MEMBER)
    monitor = await monitor_service.get_monitor(db, workspace_id, monitor_id)
    monitor = await monitor_service.set_status(db, monitor, MonitorStatus.ACTIVE)
    return MonitorOut.model_validate(monitor)


@router.post("/{monitor_id}/run-now", response_model=MonitorOut)
async def run_now(
    workspace_id: uuid.UUID, monitor_id: uuid.UUID, current_user: CurrentUser, db: DbSession
) -> MonitorOut:
    member = await workspace_service.get_membership(db, workspace_id, current_user.id)
    require_role(member.role, WorkspaceRole.MEMBER)
    monitor = await monitor_service.get_monitor(db, workspace_id, monitor_id)
    monitor = await monitor_service.run_now(db, monitor)

    from src.services.task_dispatch import enqueue_check_monitor

    enqueue_check_monitor(monitor.id)
    return MonitorOut.model_validate(monitor)
