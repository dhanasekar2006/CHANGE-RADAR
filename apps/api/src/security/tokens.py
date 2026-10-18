from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from enum import StrEnum

from jose import JWTError, jwt

from src.config import Settings
from packages.shared.errors import AuthenticationError


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"
    PASSWORD_RESET = "password_reset"


def create_token(*, subject: uuid.UUID, token_type: TokenType, settings: Settings) -> str:
    now = datetime.now(timezone.utc)
    if token_type is TokenType.ACCESS:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    elif token_type is TokenType.PASSWORD_RESET:
        expires_delta = timedelta(hours=1)
    else:
        expires_delta = timedelta(days=settings.refresh_token_expire_days)

    payload = {
        "sub": str(subject),
        "type": token_type.value,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str, *, expected_type: TokenType, settings: Settings) -> uuid.UUID:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise AuthenticationError("invalid or expired token") from exc

    if payload.get("type") != expected_type.value:
        raise AuthenticationError("unexpected token type")

    subject = payload.get("sub")
    if not subject:
        raise AuthenticationError("token missing subject")

    return uuid.UUID(subject)
