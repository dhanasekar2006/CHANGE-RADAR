from __future__ import annotations

from packages.core.fetchers.base import FetchResult, Fetcher
from packages.core.fetchers.http_fetcher import HttpFetcher

FEED_CONTENT_TYPES = (
    "application/rss+xml",
    "application/atom+xml",
    "application/xml",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
)


class FeedFetcher(Fetcher):
    """Fetches structured sources (RSS/Atom/CSV/XLSX).

    Delegates the actual transport to HttpFetcher — the distinction from
    HttpFetcher is downstream, in which extractor/normalizer/differ the
    pipeline picks for the response's content type.
    """

    def __init__(self) -> None:
        self._http = HttpFetcher()

    async def fetch(
        self,
        url: str,
        *,
        etag: str | None = None,
        last_modified: str | None = None,
        wait_for: str | None = None,
    ) -> FetchResult:
        return await self._http.fetch(url, etag=etag, last_modified=last_modified)
