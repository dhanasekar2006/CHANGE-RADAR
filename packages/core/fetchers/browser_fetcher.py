from __future__ import annotations

from packages.core.fetchers.base import FetchResult, Fetcher
from packages.shared.errors import FetchError

DEFAULT_NAV_TIMEOUT_MS = 30_000


class BrowserFetcher(Fetcher):
    """Renders the page with Playwright before capturing it.

    Use for JS-heavy SPAs where the meaningful content isn't in the initial
    HTML response. Slower and more resource-intensive than HttpFetcher, so
    monitors default to HTTP and opt into this explicitly.
    """

    def __init__(self, nav_timeout_ms: int = DEFAULT_NAV_TIMEOUT_MS) -> None:
        self._nav_timeout_ms = nav_timeout_ms

    async def fetch(
        self,
        url: str,
        *,
        etag: str | None = None,
        last_modified: str | None = None,
        wait_for: str | None = None,
    ) -> FetchResult:
        try:
            from playwright.async_api import async_playwright
        except ImportError as exc:  # pragma: no cover - environment guard
            raise FetchError(
                "playwright is not installed; run `playwright install chromium`"
            ) from exc

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch()
                try:
                    page = await browser.new_page(user_agent="ChangeRadar/1.0 (+browser)")
                    await page.goto(url, timeout=self._nav_timeout_ms, wait_until="networkidle")
                    if wait_for:
                        await page.wait_for_selector(wait_for, timeout=self._nav_timeout_ms)
                    html = await page.content()
                    status = 200
                finally:
                    await browser.close()
        except Exception as exc:  # noqa: BLE001 - surfaced as a domain error
            raise FetchError(f"browser fetch failed for {url}: {exc}", url=url) from exc

        return FetchResult(
            url=url,
            status_code=status,
            content=html.encode("utf-8"),
            content_type="text/html",
        )
