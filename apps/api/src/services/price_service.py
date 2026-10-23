from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.schemas.price import (
    AlertCreate,
    AlertOut,
    AlertUpdate,
    DealOut,
    HistoryPoint,
    ListingOut,
    ObserveResponse,
    ProductDetailOut,
    ProductSearchItem,
    SearchResponse,
)
from src.services import task_dispatch
from packages.core.models import PriceAlert, PricePoint, Product, StoreListing, User
from packages.core.prices.adapters import adapter_for_url
from packages.core.prices.urls import path_needle, url_key
from packages.core.prices.history import DEAL_WINDOW_DAYS, as_utc, range_start, time_weighted_average
from packages.shared.errors import NotFoundError, ValidationError

SEARCH_LIMIT = 20
DEALS_LIMIT = 10
# A listing checked this recently is not re-queued when someone views its page again.
OBSERVE_COOLDOWN = timedelta(seconds=60)


def _best(listings: list[StoreListing]) -> StoreListing | None:
    """Cheapest in-stock listing that has a price."""
    candidates = [row for row in listings if row.in_stock and row.current_price is not None]
    return min(candidates, key=lambda row: row.current_price, default=None)


def _is_url(text: str) -> bool:
    return text.startswith(("http://", "https://"))


# --- products ---------------------------------------------------------------------


async def _listings_by_product(db: AsyncSession, product_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[StoreListing]]:
    grouped: dict[uuid.UUID, list[StoreListing]] = defaultdict(list)
    if product_ids:
        rows = await db.scalars(select(StoreListing).where(StoreListing.product_id.in_(product_ids)))
        for row in rows:
            grouped[row.product_id].append(row)
    return grouped


def _like_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def find_listing_by_url(db: AsyncSession, url: str) -> StoreListing | None:
    """The listing that is the same page as `url` (see urls.url_key for what "same" means)."""
    key = url_key(url)
    needle = path_needle(url)
    stmt = select(StoreListing)
    if needle:
        stmt = stmt.where(StoreListing.url.ilike(f"%{_like_escape(needle)}%", escape="\\"))
    for listing in await db.scalars(stmt):
        if url_key(listing.url) == key:
            return listing
    return None


async def find_product_by_url(db: AsyncSession, url: str) -> Product | None:
    """The product whose listing is the same page as `url`."""
    listing = await find_listing_by_url(db, url)
    return await db.get(Product, listing.product_id) if listing else None


async def search_products(db: AsyncSession, q: str) -> SearchResponse:
    """Text search over name/category, or exact lookup when `q` is a pasted listing URL."""
    q = q.strip()
    is_url = _is_url(q)

    if is_url:
        found = await find_product_by_url(db, q)
        products = [found] if found else []
    else:
        stmt = select(Product).order_by(Product.name)
        if q:
            pattern = f"%{q}%"
            stmt = stmt.where(or_(Product.name.ilike(pattern), Product.category.ilike(pattern)))
        products = list(await db.scalars(stmt.limit(SEARCH_LIMIT)))

    listings = await _listings_by_product(db, [p.id for p in products])
    items = []
    for product in products:
        rows = listings.get(product.id, [])
        best = _best(rows)
        items.append(
            ProductSearchItem(
                id=product.id,
                name=product.name,
                image_url=product.image_url,
                category=product.category,
                best_price=float(best.current_price) if best else None,
                store_count=len(rows),
            )
        )
    return SearchResponse(items=items, query=q, is_url=is_url)


async def get_product(db: AsyncSession, product_id: uuid.UUID) -> Product:
    product = await db.get(Product, product_id)
    if product is None:
        raise NotFoundError("product not found")
    return product


async def get_product_detail(db: AsyncSession, product_id: uuid.UUID) -> ProductDetailOut:
    product = await get_product(db, product_id)
    rows = (await _listings_by_product(db, [product.id])).get(product.id, [])
    best = _best(rows)

    listings = [
        ListingOut(
            id=row.id,
            store=row.store,
            url=row.url,
            price=float(row.current_price) if row.current_price is not None else None,
            in_stock=row.in_stock,
            last_checked_at=row.last_checked_at,
            is_best=best is not None and row.id == best.id,
        )
        for row in sorted(rows, key=lambda r: (r.current_price is None, r.current_price or 0, r.store))
    ]
    checked = [row.last_checked_at for row in rows if row.last_checked_at is not None]
    return ProductDetailOut(
        id=product.id,
        name=product.name,
        image_url=product.image_url,
        category=product.category,
        listings=listings,
        best_price=float(best.current_price) if best else None,
        best_store=best.store if best else None,
        last_checked_at=max(checked, key=as_utc) if checked else None,
    )


async def _points_with_carry_in(
    db: AsyncSession, listing_ids: list[uuid.UUID], start: datetime
) -> dict[uuid.UUID, list[PricePoint]]:
    """Points since `start`, plus each listing's last point *before* it.

    Prices are stored only on change, so a listing whose price hasn't moved in
    months has no row inside the window; the carry-in row is the price that was
    in effect when the window opened.
    """
    if not listing_ids:
        return {}

    latest_before = (
        select(PricePoint.listing_id.label("listing_id"), func.max(PricePoint.checked_at).label("checked_at"))
        .where(PricePoint.listing_id.in_(listing_ids), PricePoint.checked_at < start)
        .group_by(PricePoint.listing_id)
        .subquery()
    )
    rows = await db.scalars(
        select(PricePoint)
        .outerjoin(
            latest_before,
            and_(
                PricePoint.listing_id == latest_before.c.listing_id,
                PricePoint.checked_at == latest_before.c.checked_at,
            ),
        )
        .where(
            PricePoint.listing_id.in_(listing_ids),
            or_(PricePoint.checked_at >= start, latest_before.c.listing_id.is_not(None)),
        )
        .order_by(PricePoint.checked_at)
    )
    grouped: dict[uuid.UUID, list[PricePoint]] = defaultdict(list)
    for row in rows:
        grouped[row.listing_id].append(row)
    return grouped


async def get_history(
    db: AsyncSession, product_id: uuid.UUID, range_key: str, now: datetime | None = None
) -> list[HistoryPoint]:
    """Price points for every store of a product within the range, oldest first.

    A point that predates the range is clamped to the range start, so each
    store's line begins at the price it held when the window opened.
    """
    now = now or datetime.now(timezone.utc)
    start = range_start(range_key, now)

    product = await get_product(db, product_id)
    listings = (await _listings_by_product(db, [product.id])).get(product.id, [])
    by_id = {row.id: row for row in listings}
    points = await _points_with_carry_in(db, list(by_id), start)

    history = [
        HistoryPoint(date=max(as_utc(p.checked_at), start), price=float(p.price), store=by_id[listing_id].store)
        for listing_id, rows in points.items()
        for p in rows
    ]
    history.sort(key=lambda h: (h.date, h.store))
    return history


# --- deals ------------------------------------------------------------------------


async def top_deals(db: AsyncSession, now: datetime | None = None) -> list[DealOut]:
    """Products whose cheapest in-stock price is furthest below its 30-day average."""
    now = now or datetime.now(timezone.utc)
    start = now - timedelta(days=DEAL_WINDOW_DAYS)

    listings = list(
        await db.scalars(
            select(StoreListing).where(StoreListing.in_stock.is_(True), StoreListing.current_price.is_not(None))
        )
    )
    if not listings:
        return []

    points = await _points_with_carry_in(db, [row.id for row in listings], start)
    products = {p.id: p for p in await db.scalars(select(Product).where(Product.id.in_({r.product_id for r in listings})))}

    best_per_product: dict[uuid.UUID, DealOut] = {}
    for listing in listings:
        series = [(p.checked_at, p.price) for p in points.get(listing.id, [])]
        average = time_weighted_average(series, start, now)
        if average is None or average <= 0 or listing.current_price >= average:
            continue
        drop = average - listing.current_price
        deal = DealOut(
            product_id=listing.product_id,
            name=products[listing.product_id].name,
            image_url=products[listing.product_id].image_url,
            store=listing.store,
            price=float(listing.current_price),
            avg_30d=float(average),
            drop_amount=float(drop),
            drop_pct=round(float(drop / average * 100), 1),
        )
        current = best_per_product.get(listing.product_id)
        if current is None or deal.drop_pct > current.drop_pct:
            best_per_product[listing.product_id] = deal

    return sorted(best_per_product.values(), key=lambda d: d.drop_pct, reverse=True)[:DEALS_LIMIT]


# --- tracking a pasted URL ---------------------------------------------------------


async def track_url(db: AsyncSession, url: str) -> Product:
    """Create a product + listing for a store URL we have an adapter for (idempotent)."""
    url = url.strip()
    existing = await find_product_by_url(db, url)
    if existing is not None:
        return existing

    adapter = adapter_for_url(url)
    if adapter is None:
        host = (urlparse(url).hostname or "that site").removeprefix("www.")
        raise ValidationError(
            f"{host} isn't set up for price tracking yet. "
            f"Add it to PRICE_JSONLD_STORES in .env (e.g. store={host}) and restart.",
            url=url,
        )

    result = await adapter.fetch(url)  # FetchError / ExtractionError propagate as 502 / 422
    now = datetime.now(timezone.utc)

    product = Product(name=(result.title or url)[:255])
    db.add(product)
    await db.flush()
    listing = StoreListing(
        product_id=product.id,
        store=adapter.store,
        url=url,
        current_price=result.price,
        in_stock=result.in_stock,
        last_checked_at=now,
    )
    db.add(listing)
    await db.flush()
    db.add(PricePoint(listing_id=listing.id, price=result.price, checked_at=now))
    await db.commit()
    await db.refresh(product)
    return product


# --- a user is looking at a product page (browser extension) ----------------------


async def observe_url(db: AsyncSession, url: str, now: datetime | None = None) -> ObserveResponse:
    """Re-check a tracked listing now because someone is viewing its page.

    The price the viewer's browser sees is deliberately not accepted: the worker
    fetches the page itself through the normal check, so a forged report can't
    write history or fire other users' alerts. The update then reaches every open
    /prices tab over /ws/prices like any scheduled check.
    """
    now = now or datetime.now(timezone.utc)
    url = url.strip()
    listing = await find_listing_by_url(db, url)
    if listing is None:
        return ObserveResponse(status="untracked", supported=adapter_for_url(url) is not None)

    if listing.last_checked_at is not None and now - as_utc(listing.last_checked_at) < OBSERVE_COOLDOWN:
        return ObserveResponse(status="fresh", product_id=listing.product_id, supported=True)

    task_dispatch.enqueue_check_listing(listing.id)
    return ObserveResponse(status="queued", product_id=listing.product_id, supported=True)


# --- alerts -----------------------------------------------------------------------


async def _alert_out(db: AsyncSession, alert: PriceAlert, product: Product | None = None) -> AlertOut:
    product = product or await get_product(db, alert.product_id)
    rows = (await _listings_by_product(db, [product.id])).get(product.id, [])
    best = _best(rows)
    return AlertOut(
        id=alert.id,
        product_id=alert.product_id,
        product_name=product.name,
        image_url=product.image_url,
        target_price=float(alert.target_price),
        channels=alert.channels,
        triggered_at=alert.triggered_at,
        created_at=alert.created_at,
        current_price=float(best.current_price) if best else None,
    )


async def list_alerts(db: AsyncSession, user: User) -> list[AlertOut]:
    alerts = list(
        await db.scalars(
            select(PriceAlert).where(PriceAlert.user_id == user.id).order_by(PriceAlert.created_at.desc())
        )
    )
    products = {
        p.id: p for p in await db.scalars(select(Product).where(Product.id.in_({a.product_id for a in alerts})))
    }
    return [await _alert_out(db, alert, products.get(alert.product_id)) for alert in alerts]


async def get_alert(db: AsyncSession, user: User, alert_id: uuid.UUID) -> PriceAlert:
    alert = await db.scalar(select(PriceAlert).where(PriceAlert.id == alert_id, PriceAlert.user_id == user.id))
    if alert is None:
        raise NotFoundError("alert not found")
    return alert


async def create_alert(db: AsyncSession, user: User, payload: AlertCreate) -> AlertOut:
    await get_product(db, payload.product_id)
    alert = PriceAlert(
        user_id=user.id,
        product_id=payload.product_id,
        target_price=payload.target_price,
        channels=[c.model_dump(exclude_none=True) for c in payload.channels],
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return await _alert_out(db, alert)


async def update_alert(db: AsyncSession, user: User, alert_id: uuid.UUID, payload: AlertUpdate) -> AlertOut:
    alert = await get_alert(db, user, alert_id)
    if payload.target_price is not None and payload.target_price != alert.target_price:
        alert.target_price = payload.target_price
        alert.triggered_at = None  # a new target re-arms the alert
    if payload.channels is not None:
        alert.channels = [c.model_dump(exclude_none=True) for c in payload.channels]
    await db.commit()
    await db.refresh(alert)
    return await _alert_out(db, alert)


async def delete_alert(db: AsyncSession, user: User, alert_id: uuid.UUID) -> None:
    alert = await get_alert(db, user, alert_id)
    await db.delete(alert)
    await db.commit()
