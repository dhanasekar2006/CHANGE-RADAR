from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class PriceResult:
    price: Decimal
    in_stock: bool
    title: str | None = None


class PriceFetcher(ABC):
    """Reads one store's current price for a product page.

    One subclass per store, registered in `packages.core.prices.adapters`. An
    adapter owns *how* a store is read (HTML selectors, JSON-LD, an official or
    affiliate API) and returns the same `PriceResult` either way, so adding a
    store never touches the tracking pipeline.

    Adapters that fetch over HTTP must go through `packages.core.prices.http.get_page`
    so robots.txt and the User-Agent policy are applied uniformly.
    """

    store: str
    """Registry key; stored in StoreListing.store."""

    @abstractmethod
    def supports(self, url: str) -> bool:
        """True if this adapter can read `url` (used to validate user-submitted links)."""

    @abstractmethod
    async def fetch(self, url: str) -> PriceResult:
        """Return the current price. Raise FetchError / ExtractionError on failure."""
