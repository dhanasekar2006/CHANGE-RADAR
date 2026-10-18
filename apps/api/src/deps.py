from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import Settings, get_settings
from src.security.tokens import TokenType, decode_token
from packages.core.models import User
from packages.core.storage import SnapshotStorage
from packages.shared.errors import AuthenticationError

_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None
_storage: SnapshotStorage | None = None


def _get_session_factory(settings: Settings) -> async_sessionmaker[AsyncSession]:
    global _engine, _session_factory
    if _session_factory is None:
        _engine = create_async_engine(settings.database_url, pool_pre_ping=True)
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _session_factory


async def get_db(
    settings: Annotated[Settings, Depends(get_settings)],
) -> AsyncGenerator[AsyncSession, None]:
    factory = _get_session_factory(settings)
    async with factory() as session:
        yield session


async def get_current_user(
    settings: Annotated[Settings, Depends(get_settings)],
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise AuthenticationError("missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    user_id = decode_token(token, expected_type=TokenType.ACCESS, settings=settings)

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise AuthenticationError("user not found or inactive")

    return user


def get_storage(settings: Annotated[Settings, Depends(get_settings)]) -> SnapshotStorage:
    global _storage
    if _storage is None:
        _storage = SnapshotStorage(
            endpoint_url=settings.s3_endpoint_url,
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            bucket=settings.s3_bucket,
            region=settings.s3_region,
        )
    return _storage


CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
Storage = Annotated[SnapshotStorage, Depends(get_storage)]
