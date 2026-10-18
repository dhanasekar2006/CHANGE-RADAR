from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timezone

import redis

from src.celery_app import celery_app
from src.config import get_settings
from src.utils.db import get_session
from src.utils.locks import monitor_lock
from src.utils.rate_limiter import DomainRateLimiter
from packages.core.differs import JsonDiffer, TextDiffer
from packages.core.extractors import CssExtractor, JsonPathExtractor, ReadabilityExtractor, XPathExtractor
from packages.core.fetchers import BrowserFetcher, FeedFetcher, HttpFetcher
from packages.core.models import Monitor, MonitorRun, Snapshot
from packages.core.normalizers import apply_ignore_rules, normalize_whitespace
from packages.core.scoring import score_significance
from packages.core.storage import SnapshotStorage
from packages.shared.constants import DiffType, ExtractorType, FetcherType, MonitorStatus
from packages.shared.logging import get_logger

logger = get_logger("worker.check_monitor")

FETCHERS = {
    FetcherType.HTTP: HttpFetcher,
    FetcherType.BROWSER: BrowserFetcher,
    FetcherType.FEED: FeedFetcher,
}
EXTRACTORS = {
    ExtractorType.CSS: CssExtractor,
    ExtractorType.XPATH: XPathExtractor,
    ExtractorType.JSONPATH: JsonPathExtractor,
    ExtractorType.READABILITY: ReadabilityExtractor,
}
DIFFERS = {
    ExtractorType.JSONPATH: (DiffType.JSON, JsonDiffer),
}
DEFAULT_DIFFER = (DiffType.TEXT, TextDiffer)


@celery_app.task(name="worker.check_monitor", bind=True, max_retries=3)
def check_monitor(self, monitor_id: str) -> None:
    settings = get_settings()
    redis_client = redis.from_url(settings.celery_broker_url)

    with monitor_lock(redis_client, uuid.UUID(monitor_id)) as acquired:
        if not acquired:
            logger.info("skipping run: already in progress", extra={"extra_fields": {"monitor_id": monitor_id}})
            return

        with get_session(settings) as session:
            monitor = session.get(Monitor, uuid.UUID(monitor_id))
            if monitor is None or monitor.status != MonitorStatus.ACTIVE:
                return

            run = MonitorRun(monitor_id=monitor.id, started_at=datetime.now(timezone.utc))
            session.add(run)
            session.flush()

            rate_limiter = DomainRateLimiter(redis_client)
            if not rate_limiter.acquire(monitor.url):
                logger.info("domain rate limited, retrying later", extra={"extra_fields": {"monitor_id": monitor_id}})
                raise self.retry(countdown=5)

            storage = SnapshotStorage(
                endpoint_url=settings.s3_endpoint_url,
                access_key=settings.s3_access_key,
                secret_key=settings.s3_secret_key,
                bucket=settings.s3_bucket,
                region=settings.s3_region,
            )

            try:
                _run_check(monitor, run, session, storage, settings)
                run.success = True
            except Exception as exc:  # noqa: BLE001 - persisted below, then re-raised for Celery's retry policy
                run.success = False
                run.error_message = str(exc)[:2000]
                monitor.status = MonitorStatus.ERROR
                logger.exception("monitor check failed", extra={"extra_fields": {"monitor_id": monitor_id}})
                raise
            finally:
                run.finished_at = datetime.now(timezone.utc)
                monitor.last_checked_at = run.finished_at
                monitor.next_check_at = run.finished_at + _interval(monitor)
                session.commit()


def _interval(monitor: Monitor):
    from datetime import timedelta

    return timedelta(seconds=monitor.check_interval_seconds)


def _run_check(monitor: Monitor, run: MonitorRun, session, storage: SnapshotStorage, settings) -> None:
    fetcher = FETCHERS[monitor.fetcher_type]()
    result = asyncio.run(fetcher.fetch(monitor.url))

    if result.not_modified:
        return

    extractor = EXTRACTORS[monitor.extractor_type]()
    extracted = extractor.extract(result.content, monitor.selector)
    normalized = normalize_whitespace(apply_ignore_rules(extracted, monitor.ignore_rules))

    content_bytes = normalized.encode("utf-8")
    content_hash = SnapshotStorage.content_hash(content_bytes)

    from sqlalchemy import select

    previous_snapshot = session.scalar(
        select(Snapshot)
        .where(Snapshot.monitor_id == monitor.id)
        .order_by(Snapshot.created_at.desc())
    )

    if previous_snapshot is not None and previous_snapshot.content_hash == content_hash:
        return  # identical content, nothing to diff or store again

    key = SnapshotStorage.build_key(monitor.id, content_bytes)
    storage.put(key, content_bytes, "text/plain")

    snapshot = Snapshot(
        monitor_id=monitor.id,
        run_id=run.id,
        storage_key=key,
        content_hash=content_hash,
        content_type="text/plain",
        size_bytes=len(content_bytes),
    )
    session.add(snapshot)
    session.flush()

    if previous_snapshot is None:
        return  # first snapshot ever: baseline, nothing to diff against

    previous_text = storage.get(previous_snapshot.storage_key).decode("utf-8", errors="replace")
    diff_type, differ_cls = DIFFERS.get(monitor.extractor_type, DEFAULT_DIFFER)
    diff_result = differ_cls().diff(previous_text, normalized)

    if not diff_result.has_changes:
        return

    from packages.core.models import Change

    diff_key = f"diffs/{monitor.id}/{snapshot.id}"
    storage.put(diff_key, diff_result.payload.encode("utf-8"), "text/plain")

    change = Change(
        monitor_id=monitor.id,
        previous_snapshot_id=previous_snapshot.id,
        new_snapshot_id=snapshot.id,
        diff_type=diff_type,
        diff_summary=diff_result.summary,
        diff_payload_key=diff_key,
        similarity_score=diff_result.similarity_score,
        significance=score_significance(diff_result.similarity_score),
    )
    session.add(change)
    session.flush()

    from src.tasks.ai_analyze import ai_analyze

    ai_analyze.delay(str(change.id))
