from __future__ import annotations

import re
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from src.schemas.common import ORMModel


class ProductOut(ORMModel):
    id: uuid.UUID
    name: str
    image_url: str | None
    category: str | None


class ProductSearchItem(ProductOut):
    best_price: float | None
    store_count: int


class SearchResponse(BaseModel):
    items: list[ProductSearchItem]
    query: str
    is_url: bool


class ListingOut(BaseModel):
    id: uuid.UUID
    store: str
    url: str
    price: float | None
    in_stock: bool
    last_checked_at: datetime | None
    is_best: bool


class ProductDetailOut(ProductOut):
    listings: list[ListingOut]
    best_price: float | None
    best_store: str | None
    last_checked_at: datetime | None


class HistoryPoint(BaseModel):
    date: datetime
    price: float
    store: str


class DealOut(BaseModel):
    product_id: uuid.UUID
    name: str
    image_url: str | None
    store: str
    price: float
    avg_30d: float
    drop_amount: float
    drop_pct: float


class TrackRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


class ObserveRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


class ObserveResponse(BaseModel):
    status: Literal["queued", "fresh", "untracked"]
    """queued: a check was just requested; fresh: checked within the cooldown, nothing queued;
    untracked: no listing has this URL (see `supported` for whether it can be tracked)."""
    product_id: uuid.UUID | None = None
    supported: bool


_PHONE_SEPARATORS = re.compile(r"[\s\-().]")
_E164 = re.compile(r"^\+[1-9]\d{7,14}$")


class AlertChannel(BaseModel):
    type: Literal["email", "telegram", "whatsapp"]
    chat_id: str | None = Field(default=None, max_length=64)
    phone: str | None = Field(default=None, max_length=24)
    """WhatsApp number in international format, e.g. +919876543210 (spaces and dashes are removed)."""

    @model_validator(mode="after")
    def _channel_needs_its_destination(self) -> AlertChannel:
        if self.type == "telegram" and not self.chat_id:
            raise ValueError("telegram channel requires chat_id")
        if self.type == "whatsapp":
            phone = _PHONE_SEPARATORS.sub("", self.phone or "")
            if not _E164.match(phone):
                raise ValueError("whatsapp channel requires phone in international format, e.g. +919876543210")
            self.phone = phone
        return self


class AlertCreate(BaseModel):
    product_id: uuid.UUID
    target_price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    channels: list[AlertChannel] = Field(default_factory=list, max_length=4)


class AlertUpdate(BaseModel):
    target_price: Decimal | None = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    channels: list[AlertChannel] | None = Field(default=None, max_length=4)


class AlertOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    image_url: str | None
    target_price: float
    channels: list[AlertChannel]
    triggered_at: datetime | None
    created_at: datetime
    current_price: float | None
