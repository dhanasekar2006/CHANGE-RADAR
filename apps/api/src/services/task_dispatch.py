"""Dispatches work to the worker service over Celery's broker.

Deliberately does not import apps/worker code — the api only needs to know
task names and a broker URL, not task implementations. Keeps the two
services independently deployable.
"""
from __future__ import annotations

import uuid

from celery import Celery

from src.config import get_settings

_celery_client: Celery | None = None


def _get_client() -> Celery:
    global _celery_client
    if _celery_client is None:
        settings = get_settings()
        _celery_client = Celery(broker=settings.celery_broker_url)
    return _celery_client


def enqueue_check_monitor(monitor_id: uuid.UUID) -> None:
    _get_client().send_task("worker.check_monitor", args=[str(monitor_id)], queue="checks")
