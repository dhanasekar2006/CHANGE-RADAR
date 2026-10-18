from __future__ import annotations

from celery import Celery
from celery.signals import worker_process_init

from src.config import get_settings
from packages.shared.constants import TaskQueue
from packages.shared.logging import configure_logging

settings = get_settings()

celery_app = Celery(
    "changeradar",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "src.tasks.check_monitor",
        "src.tasks.notify",
        "src.tasks.ai_analyze",
        "src.tasks.maintenance",
        "src.tasks.prices",
    ],
)

celery_app.conf.update(
    task_default_queue=TaskQueue.CHECKS.value,
    task_routes={
        "worker.check_monitor": {"queue": TaskQueue.CHECKS.value},
        "worker.notify": {"queue": TaskQueue.NOTIFICATIONS.value},
        "worker.ai_analyze": {"queue": TaskQueue.AI.value},
        "worker.maintenance.*": {"queue": TaskQueue.MAINTENANCE.value},
        "worker.prices.*": {"queue": TaskQueue.CHECKS.value},
    },
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_time_limit=300,
    task_soft_time_limit=240,
    result_expires=86400,
    timezone="UTC",
    enable_utc=True,
)

from src.beat_schedule import BEAT_SCHEDULE  # noqa: E402

celery_app.conf.beat_schedule = BEAT_SCHEDULE


@worker_process_init.connect
def _init_worker_process(**kwargs) -> None:
    configure_logging("worker", settings.log_level)
