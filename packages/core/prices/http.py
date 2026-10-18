from __future__ import annotations

import os

import httpx

from packages.core.prices import robots
from packages.shared.errors import FetchError, RobotsDisallowedError

DEFAULT_USER_AGENT = "VilaiWatchBot/1.0 (+https://vilaiwatch.example/bot; price comparison)"
DEFAULT_TIMEOUT = 15.0


def default_user_agent() -> str:
    """The PRICE_USER_AGENT environment variable, or the built-in placeholder.

    Set it to something that names your bot and a real contact URL: store owners
    use it to recognise (and reach) whoever is crawling them.
    """
    return os.environ.get("PRICE_USER_AGENT", "").strip() or DEFAULT_USER_AGENT


async def get_page(url: str, *, user_agent: str | None = None, timeout: float = DEFAULT_TIMEOUT) -> str:
    """GET `url` as a well-behaved crawler: identify ourselves, honour robots.txt.

    Raises RobotsDisallowedError (don't retry) or FetchError (transient; retry
    with backoff at the task level). Per-domain rate limiting is the caller's
    job because it needs shared state (Redis) that packages/core doesn't own.
    """
    user_agent = user_agent or default_user_agent()
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        if not await robots.is_allowed(client, url, user_agent):
            raise RobotsDisallowedError(f"robots.txt disallows fetching {url}", url=url)

        try:
            response = await client.get(url, headers={"User-Agent": user_agent})
        except httpx.HTTPError as exc:
            raise FetchError(f"failed to fetch {url}: {exc}", url=url) from exc

    if response.status_code >= 400:
        raise FetchError(f"unexpected status {response.status_code} for {url}", url=url, status_code=response.status_code)
    return response.text
