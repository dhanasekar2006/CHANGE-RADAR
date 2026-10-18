from __future__ import annotations

import time
from urllib.parse import urlparse

import redis

_WINDOW_SECONDS = 1


class DomainRateLimiter:
    """Caps concurrent/rate of fetches per target domain, backed by Redis.

    Protects monitored sites from being hammered when many monitors point at
    the same domain, and keeps ChangeRadar's own IPs from tripping WAFs.
    """

    def __init__(self, redis_client: redis.Redis, max_per_second: int = 2) -> None:
        self._redis = redis_client
        self._max_per_second = max_per_second

    def acquire(self, url: str) -> bool:
        domain = urlparse(url).netloc
        window = int(time.time() // _WINDOW_SECONDS)
        key = f"domain-rate:{domain}:{window}"

        count = self._redis.incr(key)
        if count == 1:
            self._redis.expire(key, _WINDOW_SECONDS * 2)

        return count <= self._max_per_second
