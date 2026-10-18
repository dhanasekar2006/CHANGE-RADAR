from __future__ import annotations

from fastapi import APIRouter, Depends

from src.config import Settings, get_settings
from src.deps import CurrentUser, DbSession
from src.schemas.auth import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserOut,
)
from src.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenPair, status_code=201)
async def register(payload: RegisterRequest, db: DbSession, settings: Settings = Depends(get_settings)) -> TokenPair:
    user = await auth_service.register(db, payload)
    return auth_service.issue_tokens(user, settings)


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, db: DbSession, settings: Settings = Depends(get_settings)) -> TokenPair:
    user = await auth_service.authenticate(db, payload)
    return auth_service.issue_tokens(user, settings)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: DbSession, settings: Settings = Depends(get_settings)) -> TokenPair:
    return await auth_service.refresh_tokens(db, payload.refresh_token, settings)


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUser) -> UserOut:
    return UserOut.model_validate(current_user)


@router.post("/password-reset/request", status_code=202)
async def request_password_reset(
    payload: PasswordResetRequest, db: DbSession, settings: Settings = Depends(get_settings)
) -> dict:
    # TODO: dispatch the reset token via the email notifier once channel
    # infrastructure is wired here; for now this just mints the token.
    await auth_service.request_password_reset(db, payload.email, settings)
    return {"status": "if that email is registered, a reset link has been sent"}


@router.post("/password-reset/confirm", response_model=None, status_code=204)
async def confirm_password_reset(
    payload: PasswordResetConfirm, db: DbSession, settings: Settings = Depends(get_settings)
) -> None:
    await auth_service.confirm_password_reset(db, payload, settings)
