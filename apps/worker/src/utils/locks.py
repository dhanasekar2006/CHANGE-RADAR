from __future__ import annotations

import uuid
from contextlib import contextmanager

import redis

_LOCK_TIMEOUT_SECONDS = 300


@contextmanager
def monitor_lock(redis_client: redis.Redis, monitor_id: uuid.UUID):
    """Prevent two check_monitor runs for the same monitor from overlapping.

    A slow browser fetch plus a short beat interval could otherwise queue a
    second run for the same monitor before the first finishes. Yields True if
    the lock was acquired, False if another run already holds it — callers
    should skip the run rather than block, since beat will retry next tick.
    """
    key = f"monitor-lock:{monitor_id}"
    token = str(uuid.uuid4())
    acquired = redis_client.set(key, token, nx=True, ex=_LOCK_TIMEOUT_SECONDS)
    try:
        yield bool(acquired)
    finally:
        if acquired:
            # Only release if we still hold it (avoid deleting a lock some
            # other process acquired after ours expired).
            current = redis_client.get(key)
            if current is not None and current.decode() == token:
                redis_client.delete(key)
