from __future__ import annotations

import httpx

from packages.core.fetchers.base import FetchResult, Fetcher
from packages.shared.errors import FetchError

DEFAULT_TIMEOUT = 20.0
DEFAULT_USER_AGENT = "ChangeRadar/1.0 (+https://changeradar.example)"


class HttpFetcher(Fetcher):
    """Plain HTTP fetch via httpx: headers, redirects, conditional GET.

    Use for static pages, JSON/XML APIs, and anything that doesn't need
    JS execution — cheaper and faster than BrowserFetcher.
    """

    def __init__(self, timeout: float = DEFAULT_TIMEOUT, user_agent: str = DEFAULT_USER_AGENT) -> None:
        self._timeout = timeout
        self._user_agent = user_agent

    async def fetch(
        self,
        url: str,
        *,
        etag: str | None = None,
        last_modified: str | None = None,
        wait_for: str | None = None,
    ) -> FetchResult:
        headers = {"User-Agent": self._user_agent}
        if etag:
            headers["If-None-Match"] = etag
        if last_modified:
            headers["If-Modified-Since"] = last_modified

        try:
            async with httpx.AsyncClient(timeout=self._timeout, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
        except httpx.HTTPError as exc:
            raise FetchError(f"failed to fetch {url}: {exc}", url=url) from exc

        if response.status_code == 304:
            return FetchResult(
                url=url,
                status_code=304,
                content=b"",
                content_type=response.headers.get("content-type", ""),
                headers=dict(response.headers),
                not_modified=True,
            )

        if response.status_code >= 400:
            raise FetchError(
                f"unexpected status {response.status_code} for {url}",
                url=url,
                status_code=response.status_code,
            )

        return FetchResult(
            url=url,
            status_code=response.status_code,
            content=response.content,
            content_type=response.headers.get("content-type", ""),
            headers=dict(response.headers),
        )
