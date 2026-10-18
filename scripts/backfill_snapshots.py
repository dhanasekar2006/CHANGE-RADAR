#!/usr/bin/env python
"""One-off backfill: recomputes `size_bytes`/`content_hash` for snapshot rows
by re-reading their objects from storage. Intended as a template for future
data migrations that need to touch object storage, not just the database
(Alembic migrations only touch the schema/rows).

Usage: python scripts/backfill_snapshots.py [--dry-run]
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from packages.core.models import Snapshot
from packages.core.storage import SnapshotStorage


def main() -> None:
    dry_run = "--dry-run" in sys.argv

    database_url = "postgresql+psycopg://changeradar:changeradar@localhost:5432/changeradar"
    engine = create_engine(database_url)

    storage = SnapshotStorage(
        endpoint_url="http://localhost:9000",
        access_key="changeradar",
        secret_key="changeradar-secret",
        bucket="changeradar-snapshots",
    )

    updated = 0
    with Session(engine) as session:
        for snapshot in session.scalars(select(Snapshot)):
            content = storage.get(snapshot.storage_key)
            actual_hash = SnapshotStorage.content_hash(content)
            actual_size = len(content)

            if snapshot.content_hash == actual_hash and snapshot.size_bytes == actual_size:
                continue

            print(f"{snapshot.id}: hash {snapshot.content_hash} -> {actual_hash}, size {snapshot.size_bytes} -> {actual_size}")
            if not dry_run:
                snapshot.content_hash = actual_hash
                snapshot.size_bytes = actual_size
            updated += 1

        if not dry_run:
            session.commit()

    print(f"{'would update' if dry_run else 'updated'} {updated} snapshot(s)")


if __name__ == "__main__":
    main()
