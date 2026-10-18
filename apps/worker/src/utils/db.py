from __future__ import annotations

from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from src.config import Settings

_engine = None
_session_factory: sessionmaker | None = None


def _sync_url(database_url: str) -> str:
    """Celery tasks run in sync workers; swap the api's asyncpg URL for psycopg."""
    return database_url.replace("+asyncpg", "+psycopg")


def _get_session_factory(settings: Settings) -> sessionmaker:
    global _engine, _session_factory
    if _session_factory is None:
        _engine = create_engine(_sync_url(settings.database_url), pool_pre_ping=True)
        _session_factory = sessionmaker(bind=_engine, expire_on_commit=False)
    return _session_factory


@contextmanager
def get_session(settings: Settings):
    factory = _get_session_factory(settings)
    session: Session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
