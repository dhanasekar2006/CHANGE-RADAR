from __future__ import annotations

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from packages.core.models import PriceAlert, PricePoint, Product, StoreListing, User
from packages.core.prices.alerts import AlertContext
from packages.core.prices.base import PriceResult


@dataclass(frozen=True)
class PriceUpdate:
    listing_id: uuid.UUID
    product_id: uuid.UUID
    store: str
    price: Decimal
    old_price: Decimal | None
    in_stock: bool
    checked_at: datetime
    changed: bool

    def to_message(self) -> dict:
        """The payload published on the Redis "prices" channel and relayed by /ws/prices."""
        return {
            "type": "price_update",
            "product_id": str(self.product_id),
            "listing_id": str(self.listing_id),
            "store": self.store,
            "price": float(self.price),
            "old_price": float(self.old_price) if self.old_price is not None else None,
            "in_stock": self.in_stock,
            "checked_at": self.checked_at.isoformat(),
        }


def apply_result(session: Session, listing: StoreListing, result: PriceResult, now: datetime) -> PriceUpdate:
    """Record one successful check of `listing`.

    A PricePoint is written only when the price differs from the listing's
    current price (or there is none yet), so history holds one row per actual
    change rather than one per check. `last_checked_at` and `in_stock` are
    always refreshed. The caller commits.
    """
    old_price = listing.current_price
    changed = old_price is None or old_price != result.price

    if changed:
        session.add(PricePoint(listing_id=listing.id, price=result.price, checked_at=now))
        listing.current_price = result.price

    listing.in_stock = result.in_stock
    listing.last_checked_at = now

    return PriceUpdate(
        listing_id=listing.id,
        product_id=listing.product_id,
        store=listing.store,
        price=result.price,
        old_price=old_price,
        in_stock=result.in_stock,
        checked_at=now,
        changed=changed,
    )


def trigger_alerts(
    session: Session,
    update: PriceUpdate,
    send: Callable[[PriceAlert, AlertContext], bool],
    url: str,
) -> list[PriceAlert]:
    """Fire every still-armed alert for the product whose target this price meets.

    `send` delivers one alert and returns True on success; only then is the
    alert marked triggered, so a failed delivery is retried on the next check
    instead of being lost. Out-of-stock listings never trigger alerts. The
    caller commits.
    """
    if not update.in_stock:
        return []

    alerts = session.scalars(
        select(PriceAlert).where(
            PriceAlert.product_id == update.product_id,
            PriceAlert.triggered_at.is_(None),
            PriceAlert.target_price >= update.price,
        )
    ).all()
    if not alerts:
        return []

    product = session.get(Product, update.product_id)
    fired: list[PriceAlert] = []
    for alert in alerts:
        user = session.get(User, alert.user_id)
        if product is None or user is None:
            continue
        ctx = AlertContext(
            product_name=product.name,
            store=update.store,
            price=update.price,
            target_price=alert.target_price,
            url=url,
            user_email=user.email,
            previous_price=update.old_price,
        )
        if send(alert, ctx):
            alert.triggered_at = update.checked_at
            fired.append(alert)
    return fired
