#!/usr/bin/env python
"""Registers the demo store's products for price tracking.

    python scripts/seed_prices.py                      # worker runs in Docker
    python scripts/seed_prices.py --base-url http://localhost:8008   # worker runs on the host

Run `python scripts/demo_store.py` first. Safe to re-run: existing listings
(matched by URL) are left alone. The first worker check fills in the price.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from packages.core.models import Product, StoreListing

CATALOG = [
    ("Sony WH-1000XM5 Wireless Headphones", "Headphones", "sony-wh1000xm5"),
    ("Apple iPhone 15 (128 GB)", "Phones", "iphone-15-128gb"),
    ("Samsung Galaxy S24 (256 GB)", "Phones", "samsung-s24-256gb"),
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--base-url",
        default="http://host.docker.internal:8008",
        help="where the *worker* reaches the demo store (default works from Docker Desktop)",
    )
    args = parser.parse_args()

    database_url = os.environ.get(
        "DATABASE_URL", "postgresql+psycopg://changeradar:changeradar@localhost:5432/changeradar"
    ).replace("+asyncpg", "+psycopg")

    with Session(create_engine(database_url)) as session:
        for name, category, slug in CATALOG:
            url = f"{args.base_url.rstrip('/')}/p/{slug}"
            if session.scalar(select(StoreListing).where(StoreListing.url == url)):
                print(f"exists  {name}")
                continue
            product = Product(name=name, category=category)
            session.add(product)
            session.flush()
            session.add(StoreListing(product_id=product.id, store="demo", url=url))
            print(f"added   {name} -> {url}")
        session.commit()


if __name__ == "__main__":
    main()
