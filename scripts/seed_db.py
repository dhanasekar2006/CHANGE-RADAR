#!/usr/bin/env python
"""Seeds a demo workspace with a user, a couple of monitors, a channel, and
a fabricated change, so a fresh `docker compose up` has something to look
at in the dashboard immediately.

Usage: python scripts/seed_db.py
"""
from __future__ import annotations

import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from apps.api.src.security.passwords import hash_password
from packages.core.models import Base, Change, Channel, Monitor, Snapshot, User, Workspace, WorkspaceMember
from packages.shared.constants import (
    ChangeSignificance,
    ChannelType,
    DiffType,
    ExtractorType,
    FetcherType,
    MonitorStatus,
    WorkspaceRole,
)

DEMO_EMAIL = "demo@changeradar.local"
DEMO_PASSWORD = "changeradar-demo"


def main() -> None:
    database_url = "postgresql+psycopg://changeradar:changeradar@localhost:5432/changeradar"
    engine = create_engine(database_url)
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        existing = session.query(User).filter_by(email=DEMO_EMAIL).first()
        if existing:
            print(f"demo user {DEMO_EMAIL} already exists, nothing to do")
            return

        user = User(email=DEMO_EMAIL, hashed_password=hash_password(DEMO_PASSWORD), is_verified=True)
        session.add(user)
        session.flush()

        workspace = Workspace(name="Demo Workspace", slug="demo-workspace")
        session.add(workspace)
        session.flush()

        session.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role=WorkspaceRole.OWNER))

        channel = Channel(
            workspace_id=workspace.id,
            name="Demo webhook",
            type=ChannelType.WEBHOOK,
            config={"url": "https://example.com/webhook"},
        )
        session.add(channel)
        session.flush()

        monitor = Monitor(
            workspace_id=workspace.id,
            created_by_id=user.id,
            name="Example pricing page",
            url="https://example.com/pricing",
            fetcher_type=FetcherType.HTTP,
            extractor_type=ExtractorType.CSS,
            selector=".price",
            check_interval_seconds=900,
            status=MonitorStatus.ACTIVE,
            last_checked_at=datetime.now(timezone.utc) - timedelta(minutes=5),
            next_check_at=datetime.now(timezone.utc) + timedelta(minutes=10),
            channel_ids=[str(channel.id)],
        )
        session.add(monitor)
        session.flush()

        run_id = uuid.uuid4()
        snapshot = Snapshot(
            monitor_id=monitor.id,
            run_id=run_id,
            storage_key=f"snapshots/{monitor.id}/demo",
            content_hash="0" * 64,
            content_type="text/plain",
            size_bytes=42,
        )
        session.add(snapshot)
        session.flush()

        change = Change(
            monitor_id=monitor.id,
            new_snapshot_id=snapshot.id,
            diff_type=DiffType.TEXT,
            diff_summary="+1 line, -1 line",
            similarity_score=0.92,
            significance=ChangeSignificance.MODERATE,
            ai_summary="The listed price changed from $29/mo to $34/mo.",
        )
        session.add(change)

        session.commit()

    print(f"seeded demo workspace. log in with {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
