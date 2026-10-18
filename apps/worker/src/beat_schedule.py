"""Periodic dispatch + housekeeping jobs, loaded into celery_app's beat schedule."""
from __future__ import annotations

from src.config import get_settings

BEAT_SCHEDULE = {
    "dispatch-due-monitor-checks": {
        "task": "worker.maintenance.dispatch_due_checks",
        "schedule": 60.0,
    },
    "sweep-stale-monitors": {
        "task": "worker.maintenance.sweep_stale_monitors",
        "schedule": 900.0,
    },
    "enforce-snapshot-retention": {
        "task": "worker.maintenance.enforce_snapshot_retention",
        "schedule": 3600.0,
    },
    # Price tracking: a listing is re-checked once PRICE_CHECK_INTERVAL_SECONDS
    # (default 30 min) have passed since its last check. Beat ticks at most a
    # minute apart so a listing is picked up promptly once it is due, rather
    # than waiting a whole extra interval.
    "dispatch-due-price-checks": {
        "task": "worker.prices.dispatch_due_listings",
        "schedule": float(min(60, get_settings().price_check_interval_seconds)),
    },
}
