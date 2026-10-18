from __future__ import annotations

import asyncio
import uuid

from src.celery_app import celery_app
from src.config import get_settings
from src.utils.backoff import compute_backoff_seconds
from src.utils.db import get_session
from packages.core.models import Change, Channel, Monitor
from packages.core.notifiers import NOTIFIER_REGISTRY, NotificationPayload
from packages.shared.errors import NotifierError
from packages.shared.logging import get_logger

logger = get_logger("worker.notify")

DASHBOARD_BASE_URL = "http://localhost:5173"


@celery_app.task(name="worker.notify", bind=True, max_retries=5)
def notify(self, change_id: str) -> None:
    """Fans a Change out to every channel attached to its monitor.

    Each channel's send is independent — one failing (e.g. a dead webhook)
    doesn't block delivery to the others. Failures here retry with backoff;
    ai_analyze enqueues this task after scoring, so it always runs after a
    significance is set.
    """
    settings = get_settings()

    with get_session(settings) as session:
        change = session.get(Change, uuid.UUID(change_id))
        if change is None:
            return

        monitor = session.get(Monitor, change.monitor_id)
        if monitor is None or not monitor.channel_ids:
            return

        channel_ids = [uuid.UUID(cid) for cid in monitor.channel_ids]
        channels = session.query(Channel).filter(Channel.id.in_(channel_ids), Channel.is_active.is_(True)).all()

        payload = NotificationPayload(
            monitor_name=monitor.name,
            monitor_url=monitor.url,
            change_summary=change.ai_summary or change.diff_summary or "content changed",
            significance=change.significance,
            change_url=f"{DASHBOARD_BASE_URL}/changes/{change.id}",
        )

        failures = []
        for channel in channels:
            notifier_cls = NOTIFIER_REGISTRY[channel.type]
            try:
                asyncio.run(notifier_cls(channel.config).send(payload))
            except NotifierError as exc:
                failures.append((channel.id, str(exc)))
                logger.warning(
                    "notification delivery failed",
                    extra={"extra_fields": {"channel_id": str(channel.id), "error": str(exc)}},
                )

        change.notified = len(failures) < len(channels)
        session.commit()

        if failures:
            raise self.retry(countdown=compute_backoff_seconds(self.request.retries + 1))
