from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.monitor import MonitorCreate, MonitorUpdate
from packages.core.models import Monitor
from packages.shared.constants import MonitorStatus
from packages.shared.errors import NotFoundError


async def list_monitors(db: AsyncSession, workspace_id: uuid.UUID) -> list[Monitor]:
    result = await db.scalars(select(Monitor).where(Monitor.workspace_id == workspace_id))
    return list(result)


async def get_monitor(db: AsyncSession, workspace_id: uuid.UUID, monitor_id: uuid.UUID) -> Monitor:
    monitor = await db.scalar(
        select(Monitor).where(Monitor.id == monitor_id, Monitor.workspace_id == workspace_id)
    )
    if monitor is None:
        raise NotFoundError("monitor not found")
    return monitor


async def create_monitor(db: AsyncSession, workspace_id: uuid.UUID, user_id: uuid.UUID, payload: MonitorCreate) -> Monitor:
    monitor = Monitor(
        workspace_id=workspace_id,
        created_by_id=user_id,
        name=payload.name,
        url=payload.url,
        fetcher_type=payload.fetcher_type,
        extractor_type=payload.extractor_type,
        selector=payload.selector,
        ignore_rules=[rule.model_dump() for rule in payload.ignore_rules],
        check_interval_seconds=payload.check_interval_seconds,
        channel_ids=[str(cid) for cid in payload.channel_ids],
        next_check_at=datetime.now(timezone.utc),
    )
    db.add(monitor)
    await db.commit()
    await db.refresh(monitor)
    return monitor


async def update_monitor(db: AsyncSession, monitor: Monitor, payload: MonitorUpdate) -> Monitor:
    updates = payload.model_dump(exclude_unset=True)
    if "ignore_rules" in updates and updates["ignore_rules"] is not None:
        updates["ignore_rules"] = [rule if isinstance(rule, dict) else rule.model_dump() for rule in payload.ignore_rules]
    if "channel_ids" in updates and updates["channel_ids"] is not None:
        updates["channel_ids"] = [str(cid) for cid in payload.channel_ids]

    for field, value in updates.items():
        setattr(monitor, field, value)

    await db.commit()
    await db.refresh(monitor)
    return monitor


async def delete_monitor(db: AsyncSession, monitor: Monitor) -> None:
    await db.delete(monitor)
    await db.commit()


async def set_status(db: AsyncSession, monitor: Monitor, status: MonitorStatus) -> Monitor:
    monitor.status = status
    await db.commit()
    await db.refresh(monitor)
    return monitor


async def run_now(db: AsyncSession, monitor: Monitor) -> Monitor:
    """Schedule an immediate check by bringing next_check_at forward.

    The actual dispatch to Celery happens in the router (keeps the Celery
    import out of services so `services` stays testable without a broker).
    """
    monitor.next_check_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    await db.commit()
    await db.refresh(monitor)
    return monitor
