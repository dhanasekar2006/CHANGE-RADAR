from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class FetchResult:
    url: str
    status_code: int
    content: bytes
    content_type: str
    headers: dict[str, str] = field(default_factory=dict)
    not_modified: bool = False
    """True when a conditional GET (If-None-Match / If-Modified-Since) confirmed no change."""


class Fetcher(ABC):
    """Retrieves raw content for a monitor. One implementation per FetcherType."""

    @abstractmethod
    async def fetch(
        self,
        url: str,
        *,
        etag: str | None = None,
        last_modified: str | None = None,
        wait_for: str | None = None,
    ) -> FetchResult:
        """Fetch `url`.

        `etag` / `last_modified` enable conditional GETs where supported.
        `wait_for` (browser fetcher only) is a CSS selector to wait for before
        capturing the rendered DOM.
        """
        raise NotImplementedError
