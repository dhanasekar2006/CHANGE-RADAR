"""Reads real stores that publish their price as machine-readable structured data.

Most online shops embed a schema.org `Product` with an `Offer` as JSON-LD (it feeds
Google's product results), and many also set the Open Graph `product:price:*` tags.
Reading those is far sturdier than scraping a store's visual layout, and one adapter
class covers any number of stores. Nothing here knows about a specific store: the
operator lists which hosts to read in PRICE_JSONLD_STORES, see `stores_from_env`.

An official or affiliate API is still the better source where a store offers one;
write a dedicated `PriceFetcher` for that.
"""

from __future__ import annotations

import ipaddress
import json
import re
from collections.abc import Iterable, Iterator
from decimal import Decimal
from typing import Any
from urllib.parse import urlparse

from bs4 import BeautifulSoup

from packages.core.prices.base import PriceFetcher, PriceResult
from packages.core.prices.http import get_page
from packages.core.pricing import parse_price
from packages.shared.errors import ExtractionError

# Prices are stored as rupees with no conversion, so another currency must be refused, not stored.
CURRENCY = "INR"

_IN_STOCK = {"instock", "limitedavailability", "onlineonly", "instoreonly"}
# Properties that hold *other* products (related, variants, ...), never the page's own price.
_SKIP_KEYS = {
    "offers",
    "hasVariant",
    "isRelatedTo",
    "isSimilarTo",
    "isAccessoryOrSparePartFor",
    "isConsumableFor",
}
_MAX_DEPTH = 8

_STORE_KEY = re.compile(r"^[a-z][a-z0-9_-]{1,31}$")
_HOSTNAME = re.compile(r"^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$")


def _host_key(host: str) -> str:
    return host.strip().lower().removeprefix("www.")


def _type_names(node: dict[str, Any]) -> set[str]:
    raw = node.get("@type")
    values = raw if isinstance(raw, list) else [raw]
    return {str(v).rsplit("/", 1)[-1].rsplit(":", 1)[-1] for v in values if v}


def _nodes(data: Any, depth: int = 0) -> Iterator[dict[str, Any]]:
    """Every JSON object in a JSON-LD document, parents before children."""
    if depth > _MAX_DEPTH:
        return
    if isinstance(data, list):
        for item in data:
            yield from _nodes(item, depth + 1)
    elif isinstance(data, dict):
        yield data
        for key, value in data.items():
            if key not in _SKIP_KEYS and isinstance(value, (dict, list)):
                yield from _nodes(value, depth + 1)


def _offers(raw: Any) -> Iterator[dict[str, Any]]:
    if isinstance(raw, list):
        for item in raw:
            yield from _offers(item)
    elif isinstance(raw, dict):
        yield from _offers(raw.get("offers"))  # an AggregateOffer can nest its offers
        yield raw


def _is_available(raw: Any) -> bool:
    """schema.org / Open Graph availability -> in stock. Absent means "assume in stock"."""
    if raw is None or str(raw).strip() == "":
        return True
    return re.sub(r"[^a-z]", "", str(raw).rsplit("/", 1)[-1].lower()) in _IN_STOCK


def _amount(value: Any) -> tuple[Decimal, str | None] | None:
    """A JSON-LD price value (number or text like "₹1,29,999") -> (amount, currency if shown)."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return Decimal(str(value)), None
    parsed = parse_price(str(value))
    return (parsed.amount, parsed.currency) if parsed else None


def _offer_price(offer: dict[str, Any]) -> tuple[Decimal, str | None] | None:
    currency = offer.get("priceCurrency")
    for key in ("price", "lowPrice"):
        found = _amount(offer.get(key))
        if found:
            return found[0], currency or found[1]
    specs = offer.get("priceSpecification")
    for spec in specs if isinstance(specs, list) else [specs]:
        if isinstance(spec, dict) and (found := _amount(spec.get("price"))):
            return found[0], spec.get("priceCurrency") or currency or found[1]
    return None


def _from_json_ld(soup: BeautifulSoup, url: str) -> PriceResult | None:
    foreign: str | None = None
    for script in soup.find_all("script", attrs={"type": re.compile(r"ld\+json", re.I)}):
        try:
            data = json.loads(script.string or script.get_text())
        except ValueError:
            continue  # a broken block on the page must not hide a valid one

        for node in _nodes(data):
            if "Product" not in _type_names(node):
                continue
            candidates: list[tuple[Decimal, bool]] = []
            for offer in _offers(node.get("offers")):
                priced = _offer_price(offer)
                if priced is None or priced[0] <= 0:
                    continue
                amount, currency = priced
                if currency and str(currency).upper() != CURRENCY:
                    foreign = str(currency).upper()
                    continue
                candidates.append((amount, _is_available(offer.get("availability"))))
            if candidates:
                in_stock = [price for price, available in candidates if available]
                name = node.get("name")
                return PriceResult(
                    price=min(in_stock or [price for price, _ in candidates]),
                    in_stock=bool(in_stock),
                    title=str(name).strip() if name else None,
                )

    if foreign:
        raise ExtractionError(f"price is in {foreign}; only {CURRENCY} is supported", url=url)
    return None


def _from_meta_tags(soup: BeautifulSoup, url: str) -> PriceResult | None:
    def meta(*names: str) -> str | None:
        for name in names:
            tag = soup.find("meta", attrs={"property": name})
            if tag is not None and tag.get("content"):
                return str(tag["content"])
        return None

    raw = meta("product:price:amount", "og:price:amount")
    found = _amount(raw)
    if found is None or found[0] <= 0:
        return None

    currency = meta("product:price:currency", "og:price:currency") or found[1]
    if currency and currency.upper() != CURRENCY:
        raise ExtractionError(f"price is in {currency.upper()}; only {CURRENCY} is supported", url=url)

    title = meta("og:title") or (soup.title.get_text(strip=True) if soup.title else None)
    return PriceResult(
        price=found[0],
        in_stock=_is_available(meta("product:availability", "og:availability")),
        title=title or None,
    )


def parse_structured_price(html: str, url: str = "") -> PriceResult:
    """Read a product's price, stock and name from schema.org JSON-LD, else Open Graph tags.

    With several offers, the cheapest *in-stock* one wins; if none is in stock the
    cheapest is returned marked out of stock. Prices in another currency are refused.
    """
    soup = BeautifulSoup(html, "html.parser")
    result = _from_json_ld(soup, url) or _from_meta_tags(soup, url)
    if result is None:
        raise ExtractionError(
            "no price found in the page's structured data (schema.org Product / og:price)", url=url
        )
    return result


class StructuredDataFetcher(PriceFetcher):
    """One store, read through its structured data.

    Only the listed hosts are accepted, so a user-submitted link can't point the
    server at arbitrary addresses (`POST /products/track` is gated by `supports`).
    """

    def __init__(self, store: str, hosts: Iterable[str]) -> None:
        self.store = store
        self._hosts = frozenset(_host_key(h) for h in hosts)

    def supports(self, url: str) -> bool:
        parsed = urlparse(url)
        return parsed.scheme in {"http", "https"} and _host_key(parsed.hostname or "") in self._hosts

    async def fetch(self, url: str) -> PriceResult:
        return parse_structured_price(await get_page(url), url)


def stores_from_env(spec: str) -> list[StructuredDataFetcher]:
    """Build one adapter per entry of PRICE_JSONLD_STORES.

    Format: comma-separated `key=host` pairs; several hosts for one store are joined
    with `|`. The key becomes the store name shown in the UI and stored on listings.

        croma=croma.com,reliance=reliancedigital.in|www.reliancedigital.in

    Raises ValueError for anything malformed. Hosts must be public DNS names (no IP
    addresses, no `localhost`), because these are the addresses the server will fetch.
    """
    adapters: list[StructuredDataFetcher] = []
    seen: set[str] = set()
    for entry in (e.strip() for e in spec.split(",")):
        if not entry:
            continue
        key, sep, hosts_raw = entry.partition("=")
        key = key.strip().lower()
        if not sep or not _STORE_KEY.match(key):
            raise ValueError(
                f"PRICE_JSONLD_STORES: bad entry {entry!r}; expected key=host (key: a-z, 0-9, _ or -)"
            )
        if key == "demo" or key in seen:
            raise ValueError(f"PRICE_JSONLD_STORES: store key {key!r} is reserved or repeated")

        hosts = [_host_key(h) for h in hosts_raw.split("|") if h.strip()]
        if not hosts:
            raise ValueError(f"PRICE_JSONLD_STORES: store {key!r} lists no hosts")
        for host in hosts:
            if not _HOSTNAME.match(host) or _is_ip(host):
                raise ValueError(f"PRICE_JSONLD_STORES: {host!r} is not a public host name")

        seen.add(key)
        adapters.append(StructuredDataFetcher(key, hosts))
    return adapters


def _is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
    except ValueError:
        return False
    return True
