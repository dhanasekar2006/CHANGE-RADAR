from __future__ import annotations

import uuid

from src.celery_app import celery_app
from src.config import get_settings
from src.utils.db import get_session
from packages.core.models import Change
from packages.core.scoring import summarize_change
from packages.core.storage import SnapshotStorage
from packages.shared.errors import ChangeRadarError
from packages.shared.logging import get_logger

logger = get_logger("worker.ai_analyze")


@celery_app.task(name="worker.ai_analyze", bind=True, max_retries=2)
def ai_analyze(self, change_id: str) -> None:
    """Refines a Change's cheap similarity-based significance with an LLM read
    of the actual diff, then enqueues notify() either way.

    AI failure (missing key, rate limit, timeout) must never block
    notification — the similarity-based score from check_monitor is already
    on the row, so this task falls back to it on any error.
    """
    settings = get_settings()

    with get_session(settings) as session:
        change = session.get(Change, uuid.UUID(change_id))
        if change is None:
            return

        if settings.anthropic_api_key and change.diff_payload_key:
            storage = SnapshotStorage(
                endpoint_url=settings.s3_endpoint_url,
                access_key=settings.s3_access_key,
                secret_key=settings.s3_secret_key,
                bucket=settings.s3_bucket,
                region=settings.s3_region,
            )
            try:
                diff_text = storage.get(change.diff_payload_key).decode("utf-8", errors="replace")
                result = summarize_change(diff_text, api_key=settings.anthropic_api_key, model=settings.ai_model)
                change.significance = result.significance
                change.ai_summary = result.summary
            except ChangeRadarError as exc:
                logger.warning("ai scoring failed, keeping similarity-based score", extra={"extra_fields": {"error": str(exc)}})

        session.commit()

    from src.tasks.notify import notify

    notify.delay(change_id)
