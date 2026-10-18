from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from src.celery_app import celery_app
from src.config import get_settings
from src.utils.db import get_session
from packages.core.models import Monitor, Snapshot
from packages.core.storage import SnapshotStorage
from packages.shared.constants import MonitorStatus
from packages.shared.logging import get_logger

logger = get_logger("worker.maintenance")

STALE_AFTER_MULTIPLIER = 3
"""A monitor is "stale" if it hasn't checked in for this many of its own intervals."""


@celery_app.task(name="worker.maintenance.dispatch_due_checks")
def dispatch_due_checks() -> int:
    """Runs every beat tick: enqueues check_monitor for every active monitor
    whose next_check_at has passed. This is the sole entry point that turns
    "time has passed" into actual monitor runs.
    """
    from src.tasks.check_monitor import check_monitor

    settings = get_settings()
    now = datetime.now(timezone.utc)
    dispatched = 0

    with get_session(settings) as session:
        due = session.scalars(
            select(Monitor).where(Monitor.status == MonitorStatus.ACTIVE, Monitor.next_check_at <= now)
        )
        for monitor in due:
            check_monitor.delay(str(monitor.id))
            dispatched += 1

    return dispatched


@celery_app.task(name="worker.maintenance.sweep_stale_monitors")
def sweep_stale_monitors() -> int:
    """Flags monitors that should have checked in but haven't, which usually
    means their runs are erroring out silently or stuck. Marks them ERROR
    so they surface in the dashboard instead of quietly going dark.
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    flagged = 0

    with get_session(settings) as session:
        active = session.scalars(select(Monitor).where(Monitor.status == MonitorStatus.ACTIVE))
        for monitor in active:
            if monitor.last_checked_at is None:
                continue
            stale_after = timedelta(seconds=monitor.check_interval_seconds * STALE_AFTER_MULTIPLIER)
            if now - monitor.last_checked_at > stale_after:
                monitor.status = MonitorStatus.ERROR
                flagged += 1
                logger.warning("monitor flagged stale", extra={"extra_fields": {"monitor_id": str(monitor.id)}})

    return flagged


@celery_app.task(name="worker.maintenance.enforce_snapshot_retention")
def enforce_snapshot_retention() -> int:
    """Deletes snapshot rows (and their objects in storage) past the
    configured retention window, keeping storage costs bounded.
    """
    settings = get_settings()
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.snapshot_retention_days)
    deleted = 0

    storage = SnapshotStorage(
        endpoint_url=settings.s3_endpoint_url,
        access_key=settings.s3_access_key,
        secret_key=settings.s3_secret_key,
        bucket=settings.s3_bucket,
        region=settings.s3_region,
    )

    with get_session(settings) as session:
        expired = session.scalars(select(Snapshot).where(Snapshot.created_at < cutoff))
        for snapshot in expired:
            try:
                storage.delete(snapshot.storage_key)
            except Exception:  # noqa: BLE001 - best-effort; row deletion still proceeds
                logger.warning("failed to delete snapshot object", extra={"extra_fields": {"key": snapshot.storage_key}})
            session.delete(snapshot)
            deleted += 1

    return deleted
