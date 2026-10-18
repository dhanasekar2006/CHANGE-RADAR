from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import Settings
from src.schemas.auth import LoginRequest, PasswordResetConfirm, RegisterRequest, TokenPair
from src.security.passwords import hash_password, verify_password
from src.security.tokens import TokenType, create_token, decode_token
from packages.core.models import User, Workspace, WorkspaceMember
from packages.shared.constants import WorkspaceRole
from packages.shared.errors import AuthenticationError, ConflictError

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(name: str) -> str:
    return _SLUG_RE.sub("-", name.lower()).strip("-") or "workspace"


async def register(db: AsyncSession, payload: RegisterRequest) -> User:
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise ConflictError("an account with this email already exists")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    await db.flush()

    workspace = Workspace(name=payload.workspace_name, slug=_slugify(payload.workspace_name))
    db.add(workspace)
    await db.flush()

    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=user.id, role=WorkspaceRole.OWNER))
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate(db: AsyncSession, payload: LoginRequest) -> User:
    user = await db.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise AuthenticationError("invalid email or password")
    if not user.is_active:
        raise AuthenticationError("account is disabled")
    return user


def issue_tokens(user: User, settings: Settings) -> TokenPair:
    return TokenPair(
        access_token=create_token(subject=user.id, token_type=TokenType.ACCESS, settings=settings),
        refresh_token=create_token(subject=user.id, token_type=TokenType.REFRESH, settings=settings),
    )


async def refresh_tokens(db: AsyncSession, refresh_token: str, settings: Settings) -> TokenPair:
    user_id = decode_token(refresh_token, expected_type=TokenType.REFRESH, settings=settings)
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise AuthenticationError("user not found or inactive")
    return issue_tokens(user, settings)


async def request_password_reset(db: AsyncSession, email: str, settings: Settings) -> str | None:
    """Return a password reset token for `email`, or None if no such account.

    The router always responds success regardless of the return value, so
    the API doesn't leak which emails are registered. Delivering the token
    (email) is left to the caller/notification layer.
    """
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        return None
    return create_token(subject=user.id, token_type=TokenType.PASSWORD_RESET, settings=settings)


async def confirm_password_reset(db: AsyncSession, payload: PasswordResetConfirm, settings: Settings) -> None:
    user_id = decode_token(payload.token, expected_type=TokenType.PASSWORD_RESET, settings=settings)
    user = await db.get(User, user_id)
    if user is None:
        raise AuthenticationError("invalid or expired token")

    user.hashed_password = hash_password(payload.new_password)
    await db.commit()
