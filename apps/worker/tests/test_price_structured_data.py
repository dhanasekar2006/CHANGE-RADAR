import asyncio
import json

import httpx
import pytest

from packages.core.prices import http
from packages.core.prices.adapters import build_adapters
from packages.core.prices.adapters import structured_data as sd
from packages.core.prices.adapters.structured_data import (
    StructuredDataFetcher,
    parse_structured_price,
    stores_from_env,
)
from packages.shared.errors import ExtractionError


def page(*blocks: object, head: str = "") -> str:
    scripts = "".join(f'<script type="application/ld+json">{json.dumps(b)}</script>' for b in blocks)
    return f"<html><head><title>Shop</title>{head}{scripts}</head><body><h1>Shop</h1></body></html>"


def product(offers: object, name: str = "Sony WH-1000XM5", **extra: object) -> dict:
    return {"@context": "https://schema.org", "@type": "Product", "name": name, "offers": offers, **extra}


def offer(
    price: object, availability: str | None = "https://schema.org/InStock", currency: str | None = "INR"
) -> dict:
    out: dict = {"@type": "Offer", "price": price}
    if availability:
        out["availability"] = availability
    if currency:
        out["priceCurrency"] = currency
    return out


# --- reading JSON-LD -----------------------------------------------------------------


def test_reads_price_stock_and_name() -> None:
    result = parse_structured_price(page(product(offer("24990.00"))))
    assert str(result.price) == "24990.00"
    assert result.in_stock is True
    assert result.title == "Sony WH-1000XM5"


def test_numeric_price_and_graph_wrapper() -> None:
    graph = {"@context": "https://schema.org", "@graph": [{"@type": "WebPage"}, product(offer(24990.5))]}
    assert str(parse_structured_price(page(graph)).price) == "24990.5"


def test_indian_grouped_price_text() -> None:
    assert str(parse_structured_price(page(product(offer("₹1,29,999", currency=None)))).price) == "129999"


def test_product_nested_under_main_entity() -> None:
    wrapper = {"@type": "WebPage", "mainEntity": product(offer("999"))}
    assert str(parse_structured_price(page(wrapper)).price) == "999"


def test_cheapest_in_stock_offer_wins_over_cheaper_sold_out_one() -> None:
    offers = [offer("20000", "https://schema.org/OutOfStock"), offer("26000"), offer("25000")]
    result = parse_structured_price(page(product(offers)))
    assert str(result.price) == "25000"
    assert result.in_stock is True


def test_all_sold_out_returns_cheapest_marked_out_of_stock() -> None:
    offers = [offer("30000", "OutOfStock"), offer("28000", "SoldOut")]
    result = parse_structured_price(page(product(offers)))
    assert str(result.price) == "28000"
    assert result.in_stock is False


def test_aggregate_offer_uses_low_price() -> None:
    aggregate = {"@type": "AggregateOffer", "lowPrice": "24990", "priceCurrency": "INR"}
    assert str(parse_structured_price(page(product(aggregate))).price) == "24990"


def test_price_specification() -> None:
    spec = {
        "@type": "Offer",
        "priceSpecification": {"@type": "PriceSpecification", "price": "1499", "priceCurrency": "INR"},
    }
    assert str(parse_structured_price(page(product(spec))).price) == "1499"


def test_missing_availability_is_assumed_in_stock() -> None:
    assert parse_structured_price(page(product(offer("100", availability=None)))).in_stock is True


@pytest.mark.parametrize("value", ["https://schema.org/InStock", "InStock", "LimitedAvailability"])
def test_in_stock_values(value: str) -> None:
    assert parse_structured_price(page(product(offer("100", value)))).in_stock is True


@pytest.mark.parametrize("value", ["https://schema.org/OutOfStock", "Discontinued", "PreOrder", "SoldOut"])
def test_not_in_stock_values(value: str) -> None:
    assert parse_structured_price(page(product(offer("100", value)))).in_stock is False


def test_related_products_never_supply_the_price() -> None:
    cheap_accessory = product(offer("99"), name="Cheap case")
    main = product(offer("24990"), isRelatedTo=[cheap_accessory], isAccessoryOrSparePartFor=cheap_accessory)
    result = parse_structured_price(page(main))
    assert str(result.price) == "24990"
    assert result.title == "Sony WH-1000XM5"


def test_a_broken_block_does_not_hide_a_valid_one() -> None:
    html = '<script type="application/ld+json">{ not json</script>' + page(product(offer("500")))
    assert str(parse_structured_price(html).price) == "500"


def test_zero_price_is_ignored() -> None:
    with pytest.raises(ExtractionError):
        parse_structured_price(page(product(offer("0"))))


# --- currency guard ------------------------------------------------------------------


def test_other_currency_is_refused_not_stored_as_rupees() -> None:
    with pytest.raises(ExtractionError, match="USD"):
        parse_structured_price(page(product(offer("299.00", currency="USD"))))


def test_inr_offer_is_used_when_another_currency_is_also_listed() -> None:
    result = parse_structured_price(page(product([offer("299", currency="USD"), offer("24990")])))
    assert str(result.price) == "24990"


# --- Open Graph fallback and failure ---------------------------------------------------


def test_open_graph_tags_when_there_is_no_json_ld() -> None:
    head = (
        '<meta property="og:title" content="Phone X">'
        '<meta property="product:price:amount" content="45999">'
        '<meta property="product:price:currency" content="INR">'
        '<meta property="product:availability" content="out of stock">'
    )
    result = parse_structured_price(page(head=head))
    assert (str(result.price), result.in_stock, result.title) == ("45999", False, "Phone X")


def test_open_graph_foreign_currency_is_refused() -> None:
    head = '<meta property="og:price:amount" content="10"><meta property="og:price:currency" content="EUR">'
    with pytest.raises(ExtractionError, match="EUR"):
        parse_structured_price(page(head=head))


def test_page_without_structured_data_raises() -> None:
    with pytest.raises(ExtractionError, match="structured data"):
        parse_structured_price("<html><body><h1>Nothing here</h1></body></html>")


# --- which URLs the adapter will fetch ------------------------------------------------


def test_supports_only_configured_hosts() -> None:
    adapter = StructuredDataFetcher("croma", ["croma.com"])
    assert adapter.supports("https://croma.com/p/1")
    assert adapter.supports("https://www.croma.com/p/1")  # www is the same host
    assert adapter.supports("http://CROMA.com/p/1")
    assert not adapter.supports("https://evil.example/p/1")
    assert not adapter.supports("https://croma.com.evil.example/p/1")
    assert not adapter.supports("https://croma.com@evil.example/p/1")  # real host is after the @
    assert not adapter.supports("http://169.254.169.254/latest/meta-data")
    assert not adapter.supports("http://localhost:8000/health/live")
    assert not adapter.supports("file:///etc/passwd")


# --- PRICE_JSONLD_STORES --------------------------------------------------------------


def test_empty_spec_enables_no_real_store() -> None:
    assert stores_from_env("") == []
    assert stores_from_env(" , ") == []
    assert list(build_adapters("")) == ["demo"]


def test_spec_builds_one_adapter_per_store_with_several_hosts() -> None:
    adapters = build_adapters("croma=croma.com, reliance=reliancedigital.in|shop.reliancedigital.in")
    assert list(adapters) == ["demo", "croma", "reliance"]
    reliance = adapters["reliance"]
    assert reliance.supports("https://shop.reliancedigital.in/x") and reliance.supports(
        "https://reliancedigital.in/x"
    )
    assert not reliance.supports("https://croma.com/x")


@pytest.mark.parametrize(
    "spec",
    [
        "croma",  # no host
        "=croma.com",  # no key
        "Croma Store=croma.com",  # bad key
        "demo=croma.com",  # reserved
        "a1=croma.com,a1=other.com",  # repeated
        "croma=",  # no hosts
        "croma=localhost",
        "croma=127.0.0.1",
        "croma=10.0.0.5",
        "croma=internal",  # single label
        "croma=croma.com/path",
    ],
)
def test_bad_spec_is_rejected(spec: str) -> None:
    with pytest.raises(ValueError, match="PRICE_JSONLD_STORES"):
        stores_from_env(spec)


# --- fetching ---------------------------------------------------------------------------


def test_fetch_goes_through_get_page(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[str] = []

    async def fake_get_page(url: str) -> str:
        seen.append(url)
        return page(product(offer("24990")))

    monkeypatch.setattr(sd, "get_page", fake_get_page)
    result = asyncio.run(StructuredDataFetcher("croma", ["croma.com"]).fetch("https://croma.com/p/1"))
    assert seen == ["https://croma.com/p/1"]
    assert str(result.price) == "24990"


def test_user_agent_comes_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PRICE_USER_AGENT", raising=False)
    assert http.default_user_agent() == http.DEFAULT_USER_AGENT
    monkeypatch.setenv("PRICE_USER_AGENT", "  MyBot/2.0 (+https://me.example/bot)  ")
    assert http.default_user_agent() == "MyBot/2.0 (+https://me.example/bot)"
    monkeypatch.setenv("PRICE_USER_AGENT", "   ")
    assert http.default_user_agent() == http.DEFAULT_USER_AGENT


def test_get_page_sends_the_configured_user_agent(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.headers["user-agent"])
        return httpx.Response(200, text="ok")

    real_client = httpx.AsyncClient

    async def allow(*_args: object, **_kwargs: object) -> bool:
        return True

    monkeypatch.setattr(
        http.httpx, "AsyncClient", lambda **kw: real_client(transport=httpx.MockTransport(handler), **kw)
    )
    monkeypatch.setattr(http.robots, "is_allowed", allow)
    monkeypatch.setenv("PRICE_USER_AGENT", "MyBot/2.0 (+https://me.example/bot)")

    assert asyncio.run(http.get_page("https://shop.test/p/1")) == "ok"
    assert seen == ["MyBot/2.0 (+https://me.example/bot)"]
