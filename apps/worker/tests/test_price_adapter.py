import asyncio

import httpx
import pytest

from packages.core.prices import robots
from packages.core.prices.adapters import adapter_for_url, get_adapter
from packages.core.prices.adapters.demo_store import DemoStoreFetcher, parse_product_page
from packages.shared.errors import ExtractionError, FetchError, ValidationError

PAGE = """
<html><head><title>Shop</title></head><body>
  <h1>Sony WH-1000XM5</h1>
  <span id="price" data-price="24990.00">₹24,990</span>
  <p id="availability">In stock</p>
</body></html>
"""


def test_parses_price_stock_and_title() -> None:
    result = parse_product_page(PAGE)
    assert str(result.price) == "24990.00"
    assert result.in_stock is True
    assert result.title == "Sony WH-1000XM5"


def test_falls_back_to_price_text_with_indian_grouping() -> None:
    result = parse_product_page('<h1>Phone</h1><div id="price">₹1,29,999</div>')
    assert str(result.price) == "129999"


def test_out_of_stock_from_availability_text() -> None:
    html = PAGE.replace("In stock", "Currently unavailable")
    assert parse_product_page(html).in_stock is False


def test_in_stock_attribute_wins() -> None:
    html = PAGE.replace('<p id="availability">In stock</p>', '<p data-in-stock="false">Sold out</p>')
    assert parse_product_page(html).in_stock is False


def test_missing_price_raises_extraction_error() -> None:
    with pytest.raises(ExtractionError):
        parse_product_page("<h1>No price here</h1>")


def test_unparseable_price_raises_extraction_error() -> None:
    with pytest.raises(ExtractionError):
        parse_product_page('<div id="price">Call for price</div>')


def test_supports_only_allowlisted_hosts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DEMO_STORE_HOSTS", raising=False)
    adapter = DemoStoreFetcher()
    assert adapter.supports("http://localhost:8008/p/1")
    assert adapter.supports("http://host.docker.internal:8008/p/1")
    assert not adapter.supports("http://169.254.169.254/latest/meta-data")
    assert not adapter.supports("file:///etc/passwd")
    assert adapter_for_url("https://example.com/x") is None


def test_registry_lookup() -> None:
    assert get_adapter("demo").store == "demo"
    with pytest.raises(ValidationError):
        get_adapter("nonexistent")


def _client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


async def _allowed(handler, url: str = "https://shop.test/p/1") -> bool:
    robots.clear_cache()
    async with _client(handler) as client:
        return await robots.is_allowed(client, url, "VilaiWatchBot/1.0")


def test_robots_disallow_rule_is_honoured() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="User-agent: *\nDisallow: /private/\n")

    assert asyncio.run(_allowed(handler, "https://shop.test/private/x")) is False
    assert asyncio.run(_allowed(handler, "https://shop.test/p/1")) is True


def test_robots_404_means_allowed() -> None:
    assert asyncio.run(_allowed(lambda r: httpx.Response(404))) is True


def test_robots_5xx_is_treated_as_unreadable() -> None:
    with pytest.raises(FetchError):
        asyncio.run(_allowed(lambda r: httpx.Response(503)))


def test_robots_rules_for_our_user_agent_apply() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text="User-agent: VilaiWatchBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n")

    assert asyncio.run(_allowed(handler)) is False
