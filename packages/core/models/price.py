from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.core.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Product(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An item whose price is tracked across stores. Global, not workspace-scoped."""

    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    listings: Mapped[list["StoreListing"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", order_by="StoreListing.store"
    )


class StoreListing(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One store's page for a product. `store` selects the PriceFetcher adapter."""

    __tablename__ = "store_listings"
    __table_args__ = (UniqueConstraint("url", name="uq_store_listings_url"),)

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    store: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)

    current_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    product: Mapped["Product"] = relationship(back_populates="listings")


class PricePoint(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A price observation. Only written when a listing's price actually changes."""

    __tablename__ = "price_points"

    listing_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("store_listings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)


class PriceAlert(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Notify a user once when any in-stock listing of a product reaches `target_price`."""

    __tablename__ = "price_alerts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    target_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    channels: Mapped[list] = mapped_column(
        JSON, nullable=False, default=list, comment='e.g. [{"type": "email"}, {"type": "telegram", "chat_id": "123"}]'
    )
    triggered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
