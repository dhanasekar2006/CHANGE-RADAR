from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from src.deps import CurrentUser, DbSession
from src.schemas.price import (
    HistoryPoint,
    ProductDetailOut,
    SearchResponse,
    TrackRequest,
)
from src.services import price_service

router = APIRouter(tags=["prices"])


@router.get("/products/search", response_model=SearchResponse)
async def search_products(db: DbSession, q: Annotated[str, Query(max_length=2048)] = "") -> SearchResponse:
    """Search by name/category, or paste a listing URL to find the product it belongs to."""
    return await price_service.search_products(db, q)


@router.post("/products/track", response_model=ProductDetailOut, status_code=status.HTTP_201_CREATED)
async def track_product(payload: TrackRequest, _user: CurrentUser, db: DbSession) -> ProductDetailOut:
    """Start tracking a store URL that isn't known yet (requires a supported store adapter)."""
    product = await price_service.track_url(db, payload.url)
    return await price_service.get_product_detail(db, product.id)


@router.get("/products/{product_id}", response_model=ProductDetailOut)
async def get_product(product_id: uuid.UUID, db: DbSession) -> ProductDetailOut:
    return await price_service.get_product_detail(db, product_id)


@router.get("/products/{product_id}/history", response_model=list[HistoryPoint])
async def get_history(
    product_id: uuid.UUID, db: DbSession, range: Annotated[str, Query(pattern="(?i)^(1M|3M|6M)$")] = "1M"
) -> list[HistoryPoint]:
    return await price_service.get_history(db, product_id, range)


