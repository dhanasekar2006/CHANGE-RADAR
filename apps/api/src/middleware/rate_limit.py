from __future__ import annotations

import time

import redis.asyncio as redis
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

WINDOW_SECONDS = 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Fixed-window per-IP rate limit backed by Redis.

    Keeps counters in Redis (not in-process) so the limit holds across
    multiple api replicas. Fails open if Redis is unreachable — availability
    of the API takes priority over strict rate limiting.
    """

    def __init__(self, app, redis_url: str, requests_per_minute: int = 120) -> None:
        super().__init__(app)
        self._redis = redis.from_url(redis_url, decode_responses=True)
        self._limit = requests_per_minute

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        client_ip = request.client.host if request.client else "unknown"
        window = int(time.time() // WINDOW_SECONDS)
        key = f"ratelimit:{client_ip}:{window}"

        try:
            count = await self._redis.incr(key)
            if count == 1:
                await self._redis.expire(key, WINDOW_SECONDS)
        except Exception:  # noqa: BLE001 - fail open
            return await call_next(request)

        if count > self._limit:
            return JSONResponse(
                status_code=429,
                content={"code": "rate_limited", "message": "too many requests"},
            )

        return await call_next(request)
