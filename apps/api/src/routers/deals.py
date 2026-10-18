from __future__ import annotations

from fastapi import APIRouter

from src.deps import DbSession
from src.schemas.price import DealOut
from src.services import price_service

router = APIRouter(prefix="/deals", tags=["prices"])


@router.get("/top", response_model=list[DealOut])
async def top_deals(db: DbSession) -> list[DealOut]:
    """Biggest drops of the cheapest in-stock price versus the 30-day average."""
    return await price_service.top_deals(db)
