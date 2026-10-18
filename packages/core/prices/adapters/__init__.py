"""Registry of store adapters.

To add a store: write a `PriceFetcher` subclass (see demo_store.py), then add
an instance to ADAPTERS. Nothing else in the tracking pipeline changes, which
is what lets official/affiliate API adapters replace page scraping per store.
"""
from __future__ import annotations

import os

from packages.core.prices.adapters.demo_store import DemoStoreFetcher
from packages.core.prices.adapters.structured_data import stores_from_env
from packages.core.prices.base import PriceFetcher
from packages.shared.errors import ValidationError


def build_adapters(jsonld_spec: str | None = None) -> dict[str, PriceFetcher]:
    """The demo store plus every real store listed in PRICE_JSONLD_STORES (none by default).

    API and worker read the same variable, so they always agree on which stores exist.
    """
    spec = os.environ.get("PRICE_JSONLD_STORES", "") if jsonld_spec is None else jsonld_spec
    adapters: list[PriceFetcher] = [DemoStoreFetcher(), *stores_from_env(spec)]
    return {adapter.store: adapter for adapter in adapters}


ADAPTERS: dict[str, PriceFetcher] = build_adapters()


def get_adapter(store: str) -> PriceFetcher:
    try:
        return ADAPTERS[store]
    except KeyError:
        raise ValidationError(f"no price adapter registered for store {store!r}", store=store) from None


def adapter_for_url(url: str) -> PriceFetcher | None:
    return next((a for a in ADAPTERS.values() if a.supports(url)), None)
