from __future__ import annotations

import time
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx

from packages.shared.errors import FetchError

_TTL_SECONDS = 3600
_cache: dict[str, tuple[float, RobotFileParser | None]] = {}
"""origin -> (fetched_at, parser). parser=None means "no robots.txt, everything allowed"."""


def clear_cache() -> None:
    _cache.clear()


async def is_allowed(client: httpx.AsyncClient, url: str, user_agent: str) -> bool:
    """Whether robots.txt lets `user_agent` fetch `url`.

    Follows RFC 9309: a 4xx for robots.txt means there are no restrictions; a
    5xx or network failure means we can't tell, so we treat the site as
    off-limits (raising FetchError so the caller retries later) rather than
    guessing.
    """
    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"

    cached = _cache.get(origin)
    if cached is None or time.monotonic() - cached[0] > _TTL_SECONDS:
        cached = (time.monotonic(), await _load(client, origin, user_agent))
        _cache[origin] = cached

    parser = cached[1]
    return True if parser is None else parser.can_fetch(user_agent, url)


async def _load(client: httpx.AsyncClient, origin: str, user_agent: str) -> RobotFileParser | None:
    robots_url = f"{origin}/robots.txt"
    try:
        response = await client.get(robots_url, headers={"User-Agent": user_agent})
    except httpx.HTTPError as exc:
        raise FetchError(f"could not read {robots_url}: {exc}", url=robots_url) from exc

    if 400 <= response.status_code < 500:
        return None
    if response.status_code >= 500:
        raise FetchError(f"{robots_url} returned {response.status_code}", url=robots_url)

    parser = RobotFileParser()
    parser.parse(response.text.splitlines())
    return parser
