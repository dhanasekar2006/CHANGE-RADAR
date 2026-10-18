from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timedelta, timezone

import redis
from sqlalchemy import or_, select

from src.celery_app import celery_app
from src.config import Settings, get_settings
from src.utils.backoff import compute_backoff_seconds
from src.utils.db import get_session
from src.utils.locks import monitor_lock
from src.utils.rate_limiter import DomainRateLimiter
from packages.core.models import PriceAlert, StoreListing
from packages.core.prices.adapters import get_adapter
from packages.core.prices.alerts import AlertContext, DeliveryConfig, deliver_alert
from packages.core.prices.tracker import PriceUpdate, apply_result, trigger_alerts
from packages.shared.constants import PRICE_PUBSUB_CHANNEL
from packages.shared.errors import ExtractionError, FetchError, RobotsDisallowedError
from packages.shared.logging import get_logger

logger = get_logger("worker.prices")


@celery_app.task(name="worker.prices.dispatch_due_listings")
def dispatch_due_listings() -> int:
    """Beat entry point: queue check_listing for every listing not checked within the interval."""
    settings = get_settings()
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.price_check_interval_seconds)

    with get_session(settings) as session:
        listing_ids = session.scalars(
            select(StoreListing.id).where(
                or_(StoreListing.last_checked_at.is_(None), StoreListing.last_checked_at <= cutoff)
            )
        ).all()

    for listing_id in listing_ids:
        check_listing.delay(str(listing_id))
    return len(listing_ids)


@celery_app.task(name="worker.prices.check_listing", bind=True, max_retries=6)
def check_listing(self, listing_id: str) -> None:
    """Fetch one listing's price, record it if changed, fire alerts, publish the update."""
    settings = get_settings()
    redis_client = redis.from_url(settings.redis_url)

    with monitor_lock(redis_client, uuid.UUID(listing_id)) as acquired:
        if not acquired:
            return  # a check for this listing is already running

        with get_session(settings) as session:
            listing = session.get(StoreListing, uuid.UUID(listing_id))
            if listing is None:
                return
            log_ctx = {"extra_fields": {"listing_id": listing_id, "store": listing.store, "url": listing.url}}

            if not DomainRateLimiter(redis_client).acquire(listing.url):
                raise self.retry(countdown=5)

            try:
                result = asyncio.run(get_adapter(listing.store).fetch(listing.url))
            except RobotsDisallowedError:
                logger.warning("robots.txt disallows this listing; not retrying", extra=log_ctx)
                return
            except ExtractionError as exc:
                # The page loaded but has no readable price: layout changed or the
                # adapter is wrong. Retrying won't help; surface it in the logs.
                logger.warning("price extraction failed: %s", exc, extra=log_ctx)
                return
            except FetchError as exc:
                logger.warning("price fetch failed (attempt %s): %s", self.request.retries + 1, exc, extra=log_ctx)
                raise self.retry(exc=exc, countdown=compute_backoff_seconds(self.request.retries + 1)) from exc

            now = datetime.now(timezone.utc)
            update = apply_result(session, listing, result, now)
            trigger_alerts(session, update, _make_sender(settings), listing.url)
            session.commit()

    _publish(redis_client, update)


def _make_sender(settings: Settings):
    cfg = DeliveryConfig(
        smtp_host=settings.smtp_host,
        smtp_port=settings.smtp_port,
        smtp_user=settings.smtp_user,
        smtp_password=settings.smtp_password,
        smtp_from=settings.smtp_from,
        telegram_bot_token=settings.telegram_bot_token,
        whatsapp_access_token=settings.whatsapp_access_token,
        whatsapp_phone_number_id=settings.whatsapp_phone_number_id,
        whatsapp_template_name=settings.whatsapp_template_name,
        whatsapp_template_language=settings.whatsapp_template_language,
        whatsapp_api_version=settings.whatsapp_api_version,
    )

    def send(alert: PriceAlert, ctx: AlertContext) -> bool:
        return asyncio.run(deliver_alert(alert.channels, ctx, cfg))

    return send


def _publish(redis_client: redis.Redis, update: PriceUpdate) -> None:
    """Best effort: a Redis hiccup must not fail a check whose result is already saved."""
    try:
        redis_client.publish(PRICE_PUBSUB_CHANNEL, json.dumps(update.to_message()))
    except redis.RedisError:
        logger.warning("could not publish price update", extra={"extra_fields": {"listing_id": str(update.listing_id)}})
