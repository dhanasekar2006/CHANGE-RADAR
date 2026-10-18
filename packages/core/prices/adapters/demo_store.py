from __future__ import annotations

import os
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from packages.core.pricing import parse_price
from packages.core.prices.base import PriceFetcher, PriceResult
from packages.core.prices.http import get_page
from packages.shared.errors import ExtractionError

_OUT_OF_STOCK_PHRASES = ("out of stock", "sold out", "currently unavailable")
_DEFAULT_HOSTS = "localhost,127.0.0.1,host.docker.internal"


def parse_product_page(html: str, url: str = "") -> PriceResult:
    """Read the demo store's markup.

    Price: `data-price` attribute on any element (preferred, machine readable),
    else the text of `#price`. Stock: `data-in-stock="true|false"`, else the
    text of `#availability`; assumed in stock when neither is present.
    """
    soup = BeautifulSoup(html, "html.parser")

    price_el = soup.select_one("[data-price]") or soup.select_one("#price")
    if price_el is None:
        raise ExtractionError("no price element found (expected [data-price] or #price)", url=url)

    raw = price_el.get("data-price") or price_el.get_text(" ", strip=True)
    parsed = parse_price(str(raw))
    if parsed is None:
        raise ExtractionError(f"could not parse a price from {raw!r}", url=url)

    stock_el = soup.select_one("[data-in-stock]")
    if stock_el is not None:
        in_stock = str(stock_el.get("data-in-stock")).strip().lower() not in {"false", "0", "no"}
    else:
        availability = soup.select_one("#availability")
        text = availability.get_text(" ", strip=True).lower() if availability else ""
        in_stock = not any(phrase in text for phrase in _OUT_OF_STOCK_PHRASES)

    title_el = soup.select_one("h1") or soup.select_one("title")
    title = title_el.get_text(" ", strip=True) if title_el else None

    return PriceResult(price=parsed.amount, in_stock=in_stock, title=title)


class DemoStoreFetcher(PriceFetcher):
    """Reads the local demo store (scripts/demo_store.py) or any page using the markup above.

    Only hosts in DEMO_STORE_HOSTS are accepted, so user-submitted URLs can't
    point the fetcher at arbitrary internal services.
    """

    store = "demo"

    def supports(self, url: str) -> bool:
        hosts = {h.strip().lower() for h in os.environ.get("DEMO_STORE_HOSTS", _DEFAULT_HOSTS).split(",") if h.strip()}
        parsed = urlparse(url)
        return parsed.scheme in {"http", "https"} and (parsed.hostname or "").lower() in hosts

    async def fetch(self, url: str) -> PriceResult:
        return parse_product_page(await get_page(url), url)
