from __future__ import annotations

import uuid

from fastapi import APIRouter, status

from src.deps import CurrentUser, DbSession
from src.schemas.price import AlertCreate, AlertOut, AlertUpdate
from src.services import price_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertOut])
async def list_alerts(user: CurrentUser, db: DbSession) -> list[AlertOut]:
    return await price_service.list_alerts(db, user)


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
async def create_alert(payload: AlertCreate, user: CurrentUser, db: DbSession) -> AlertOut:
    return await price_service.create_alert(db, user, payload)


@router.patch("/{alert_id}", response_model=AlertOut)
async def update_alert(alert_id: uuid.UUID, payload: AlertUpdate, user: CurrentUser, db: DbSession) -> AlertOut:
    return await price_service.update_alert(db, user, alert_id, payload)


@router.delete("/{alert_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(alert_id: uuid.UUID, user: CurrentUser, db: DbSession) -> None:
    await price_service.delete_alert(db, user, alert_id)
