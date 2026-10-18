"""Helpers for exercising the ORM models on in-memory SQLite in unit tests.

The models use `server_default=func.now()`, which SQLite can't parse in DDL;
importing this module teaches the SQLite compiler to emit CURRENT_TIMESTAMP.
Production code never imports it.
"""
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool
from sqlalchemy.sql.functions import now

from packages.core.models import Base


@compiles(now, "sqlite")
def _sqlite_now(element, compiler, **kw) -> str:  # noqa: ARG001
    return "CURRENT_TIMESTAMP"


def make_sqlite_engine() -> Engine:
    """Sync in-memory engine with every table created; one shared connection."""
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    return engine
