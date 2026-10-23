import asyncio
import concurrent.futures
import contextlib
import json
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import httpx
import pytest
import pytest_asyncio
from fastapi import WebSocketDisconnect
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import packages.core.testing  # noqa: F401  (SQLite now() shim)
from packages.core.models import Base, PriceAlert, PricePoint, Product, StoreListing, User
from src.deps import get_current_user, get_db
from src.main import app
from src.routers.ws import get_redis, relay_prices

NOW = datetime.now(timezone.utc)


def days_ago(n: float) -> datetime:
    return NOW - timedelta(days=n)


@pytest_asyncio.fixture
async def db():
    engine = create_async_engine(
        "sqlite+aiosqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        yield session
    await engine.dispose()


@pytest_asyncio.fixture
async def user(db: AsyncSession) -> User:
    row = User(email="buyer@example.com", hashed_password="x")
    db.add(row)
    await db.commit()
    return row


@pytest_asyncio.fixture
async def client(db: AsyncSession, user: User):
    async def _db():
        yield db

    app.dependency_overrides[get_db] = _db
    app.dependency_overrides[get_current_user] = lambda: user
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


async def make_product(
    db: AsyncSession,
    name: str,
    *,
    category: str | None = None,
    store: str = "demo",
    price: str | None = "100.00",
    in_stock: bool = True,
    points: list[tuple[float, str]] | None = None,
    url: str | None = None,
) -> tuple[Product, StoreListing]:
    product = Product(name=name, category=category)
    db.add(product)
    await db.flush()
    listing = StoreListing(
        product_id=product.id,
        store=store,
        url=url or f"http://localhost:8008/{uuid.uuid4()}",
        current_price=Decimal(price) if price else None,
        in_stock=in_stock,
        last_checked_at=NOW,
    )
    db.add(listing)
    await db.flush()
    for age, value in points or []:
        db.add(PricePoint(listing_id=listing.id, price=Decimal(value), checked_at=days_ago(age)))
    await db.commit()
    return product, listing


# --- history range filter --------------------------------------------------------


@pytest.mark.asyncio
async def test_history_range_filters_by_window_with_carry_in(client, db) -> None:
    product, _ = await make_product(
        db, "Headphones", points=[(200, "70"), (100, "80"), (40, "90"), (5, "100")]
    )

    async def prices(range_key: str) -> list[float]:
        response = await client.get(f"/products/{product.id}/history", params={"range": range_key})
        assert response.status_code == 200
        return [p["price"] for p in response.json()]

    # each window opens with the price in effect then (the last point before it)
    assert await prices("1M") == [90, 100]
    assert await prices("3M") == [80, 90, 100]
    assert await prices("6M") == [70, 80, 90, 100]


@pytest.mark.asyncio
async def test_history_carry_in_is_clamped_to_window_start(client, db) -> None:
    product, _ = await make_product(db, "Headphones", points=[(200, "70"), (5, "100")])
    response = await client.get(f"/products/{product.id}/history", params={"range": "1M"})
    first = datetime.fromisoformat(response.json()[0]["date"])
    assert abs((first - (datetime.now(timezone.utc) - timedelta(days=30))).total_seconds()) < 60


@pytest.mark.asyncio
async def test_history_returns_every_store_with_its_name(client, db) -> None:
    product, _ = await make_product(db, "Headphones", store="demo", points=[(5, "100")])
    other = StoreListing(product_id=product.id, store="other", url="http://localhost:8008/x", current_price=Decimal("95"))
    db.add(other)
    await db.flush()
    db.add(PricePoint(listing_id=other.id, price=Decimal("95"), checked_at=days_ago(3)))
    await db.commit()

    body = (await client.get(f"/products/{product.id}/history")).json()
    assert [(p["store"], p["price"]) for p in body] == [("demo", 100), ("other", 95)]


@pytest.mark.asyncio
async def test_history_default_range_is_one_month_and_rejects_unknown(client, db) -> None:
    product, _ = await make_product(db, "Headphones", points=[(100, "80"), (5, "100")])
    assert [p["price"] for p in (await client.get(f"/products/{product.id}/history")).json()] == [80, 100]
    assert (await client.get(f"/products/{product.id}/history", params={"range": "1Y"})).status_code == 422


@pytest.mark.asyncio
async def test_history_unknown_product_is_404(client) -> None:
    assert (await client.get(f"/products/{uuid.uuid4()}/history")).status_code == 404


# --- product details & search ------------------------------------------------------


@pytest.mark.asyncio
async def test_product_detail_marks_cheapest_in_stock_listing_as_best(client, db) -> None:
    product, _ = await make_product(db, "Headphones", store="a", price="120")
    for store, price, stock in [("b", "100", True), ("c", "80", False)]:
        db.add(
            StoreListing(
                product_id=product.id, store=store, url=f"http://localhost:8008/{store}",
                current_price=Decimal(price), in_stock=stock,
            )
        )
    await db.commit()

    body = (await client.get(f"/products/{product.id}")).json()
    assert body["best_price"] == 100 and body["best_store"] == "b"
    assert {row["store"]: row["is_best"] for row in body["listings"]} == {"a": False, "b": True, "c": False}


@pytest.mark.asyncio
async def test_search_by_name_category_and_url(client, db) -> None:
    sony, listing = await make_product(db, "Sony WH-1000XM5", category="Headphones", price="24990")
    await make_product(db, "Apple iPhone 15", category="Phones")

    by_name = (await client.get("/products/search", params={"q": "sony"})).json()
    assert [i["name"] for i in by_name["items"]] == ["Sony WH-1000XM5"]
    assert by_name["items"][0]["best_price"] == 24990 and by_name["items"][0]["store_count"] == 1

    by_category = (await client.get("/products/search", params={"q": "phones"})).json()
    assert {i["name"] for i in by_category["items"]} == {"Sony WH-1000XM5", "Apple iPhone 15"}

    by_url = (await client.get("/products/search", params={"q": listing.url})).json()
    assert by_url["is_url"] and [i["id"] for i in by_url["items"]] == [str(sony.id)]

    unknown = (await client.get("/products/search", params={"q": "http://localhost:8008/nope"})).json()
    assert unknown["is_url"] and unknown["items"] == []


@pytest.mark.asyncio
async def test_track_rejects_unsupported_store(client) -> None:
    response = await client.post("/products/track", json={"url": "https://unsupported-store.example/item/1"})
    assert response.status_code == 422


# --- observe (browser extension) ---------------------------------------------------


@pytest.fixture
def queued(monkeypatch) -> list[uuid.UUID]:
    calls: list[uuid.UUID] = []
    monkeypatch.setattr("src.services.task_dispatch.enqueue_check_listing", calls.append)
    return calls


@pytest.mark.asyncio
async def test_observe_queues_a_check_for_a_stale_listing(client, db, queued) -> None:
    product, listing = await make_product(db, "Headphones", url="http://localhost:8008/p/headphones")
    listing.last_checked_at = NOW - timedelta(minutes=10)
    await db.commit()

    # the extension sends the URL as the browser has it: tracking params, trailing slash, https
    response = await client.post(
        "/products/observe", json={"url": "https://localhost:8008/p/headphones/?utm_source=x"}
    )
    assert response.status_code == 200
    assert response.json() == {"status": "queued", "product_id": str(product.id), "supported": True}
    assert queued == [listing.id]


@pytest.mark.asyncio
async def test_observe_skips_a_listing_checked_within_the_cooldown(client, db, queued) -> None:
    product, _ = await make_product(db, "Headphones", url="http://localhost:8008/p/fresh")
    response = await client.post("/products/observe", json={"url": "http://localhost:8008/p/fresh"})
    assert response.json() == {"status": "fresh", "product_id": str(product.id), "supported": True}
    assert queued == []


@pytest.mark.asyncio
async def test_observe_untracked_url_says_whether_it_could_be_tracked(client, queued) -> None:
    supported = await client.post("/products/observe", json={"url": "http://localhost:8008/p/new-item"})
    assert supported.json() == {"status": "untracked", "product_id": None, "supported": True}

    unsupported = await client.post("/products/observe", json={"url": "https://unsupported-store.example/item/1"})
    assert unsupported.json() == {"status": "untracked", "product_id": None, "supported": False}
    assert queued == []


@pytest.mark.asyncio
async def test_observe_requires_sign_in(client) -> None:
    app.dependency_overrides.pop(get_current_user)
    response = await client.post("/products/observe", json={"url": "http://localhost:8008/p/x"})
    assert response.status_code == 401


# --- deals --------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_deals_rank_by_drop_versus_30_day_average(client, db) -> None:
    # 100 for 20 of the last 30 days, then 80 for 10 -> avg ~93.33, drop ~14.3%
    await make_product(db, "Big drop", price="80", points=[(40, "100"), (10, "80")])
    # 100 -> 95 only a day ago -> tiny drop
    await make_product(db, "Small drop", price="95", points=[(40, "100"), (1, "95")])
    await make_product(db, "No change", price="100", points=[(40, "100")])
    await make_product(db, "Price rose", price="120", points=[(40, "100"), (5, "120")])
    await make_product(db, "Out of stock", price="10", in_stock=False, points=[(40, "100"), (10, "10")])

    deals = (await client.get("/deals/top")).json()

    assert [d["name"] for d in deals] == ["Big drop", "Small drop"]
    assert deals[0]["price"] == 80 and deals[0]["drop_pct"] == pytest.approx(14.3, abs=0.1)
    assert deals[0]["avg_30d"] == pytest.approx(93.33, abs=0.05)
    assert deals[0]["drop_amount"] == pytest.approx(13.33, abs=0.05)


@pytest.mark.asyncio
async def test_deals_empty_when_nothing_tracked(client) -> None:
    assert (await client.get("/deals/top")).json() == []


# --- alerts -------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_alert_crud_and_rearm_on_new_target(client, db) -> None:
    product, _ = await make_product(db, "Headphones", price="24990")

    created = await client.post(
        "/alerts",
        json={"product_id": str(product.id), "target_price": "22000", "channels": [{"type": "email"}]},
    )
    assert created.status_code == 201
    alert = created.json()
    assert alert["target_price"] == 22000 and alert["current_price"] == 24990
    assert alert["triggered_at"] is None and alert["product_name"] == "Headphones"

    row = await db.get(PriceAlert, uuid.UUID(alert["id"]))
    row.triggered_at = NOW
    await db.commit()

    # same target keeps it triggered; a new target re-arms it
    same = await client.patch(f"/alerts/{alert['id']}", json={"target_price": "22000"})
    assert same.json()["triggered_at"] is not None
    moved = await client.patch(f"/alerts/{alert['id']}", json={"target_price": "20000"})
    assert moved.json()["triggered_at"] is None and moved.json()["target_price"] == 20000

    assert [a["id"] for a in (await client.get("/alerts")).json()] == [alert["id"]]
    assert (await client.delete(f"/alerts/{alert['id']}")).status_code == 204
    assert (await client.get("/alerts")).json() == []


@pytest.mark.asyncio
async def test_alert_validation(client, db) -> None:
    product, _ = await make_product(db, "Headphones")
    base = {"product_id": str(product.id)}

    assert (await client.post("/alerts", json={**base, "target_price": "0"})).status_code == 422
    assert (await client.post("/alerts", json={**base, "target_price": "-5"})).status_code == 422
    telegram_no_chat = {**base, "target_price": "10", "channels": [{"type": "telegram"}]}
    assert (await client.post("/alerts", json=telegram_no_chat)).status_code == 422
    unknown_product = {"product_id": str(uuid.uuid4()), "target_price": "10"}
    assert (await client.post("/alerts", json=unknown_product)).status_code == 404


@pytest.mark.asyncio
async def test_whatsapp_channel_needs_an_international_phone_number(client, db) -> None:
    product, _ = await make_product(db, "Headphones")
    base = {"product_id": str(product.id), "target_price": "10"}

    for bad in (None, "", "9876543210", "+0123456789", "+91 abc", "+12345", "+" + "9" * 20):
        channel = {"type": "whatsapp"} if bad is None else {"type": "whatsapp", "phone": bad}
        response = await client.post("/alerts", json={**base, "channels": [channel]})
        assert response.status_code == 422, bad


@pytest.mark.asyncio
async def test_whatsapp_phone_is_normalised_and_stored(client, db) -> None:
    product, _ = await make_product(db, "Headphones")
    created = await client.post(
        "/alerts",
        json={
            "product_id": str(product.id),
            "target_price": "10",
            "channels": [{"type": "email"}, {"type": "whatsapp", "phone": "+91 98765-43210"}],
        },
    )
    assert created.status_code == 201
    assert created.json()["channels"] == [
        {"type": "email", "chat_id": None, "phone": None},
        {"type": "whatsapp", "chat_id": None, "phone": "+919876543210"},
    ]

    row = await db.get(PriceAlert, uuid.UUID(created.json()["id"]))
    assert row.channels == [{"type": "email"}, {"type": "whatsapp", "phone": "+919876543210"}]


@pytest.mark.asyncio
async def test_alerts_are_private_to_their_owner(client, db) -> None:
    product, _ = await make_product(db, "Headphones")
    other = User(email="other@example.com", hashed_password="x")
    db.add(other)
    await db.flush()
    theirs = PriceAlert(user_id=other.id, product_id=product.id, target_price=Decimal("10"), channels=[])
    db.add(theirs)
    await db.commit()

    assert (await client.get("/alerts")).json() == []
    assert (await client.patch(f"/alerts/{theirs.id}", json={"target_price": "5"})).status_code == 404
    assert (await client.delete(f"/alerts/{theirs.id}")).status_code == 404


@pytest.mark.asyncio
async def test_alerts_require_authentication(db) -> None:
    async def _db():
        yield db

    app.dependency_overrides[get_db] = _db
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as c:
            assert (await c.get("/alerts")).status_code == 401
            assert (await c.post("/alerts", json={})).status_code == 401
    finally:
        app.dependency_overrides.clear()


# --- websocket relay ------------------------------------------------------------------


class FakePubSub:
    def __init__(self, messages: list[str]) -> None:
        self._messages = messages

    async def subscribe(self, *_channels) -> None: ...
    async def unsubscribe(self, *_channels) -> None: ...
    async def aclose(self) -> None: ...

    async def listen(self):
        yield {"type": "subscribe", "data": 1}
        for data in self._messages:
            yield {"type": "message", "data": data}
        await asyncio.Event().wait()  # then stay open like a real subscription


class FakeRedis:
    def __init__(self, messages: list[str]) -> None:
        self._messages = messages

    def pubsub(self) -> FakePubSub:
        return FakePubSub(self._messages)

    async def aclose(self) -> None: ...


def _message(product_id: uuid.UUID, price: float) -> str:
    return json.dumps({"type": "price_update", "product_id": str(product_id), "store": "demo", "price": price})


class FakeSocket:
    """Stands in for a WebSocket: records sent text; receive blocks until the client "disconnects"."""

    def __init__(self) -> None:
        self.sent: list[str] = []
        self.disconnected = asyncio.Event()

    async def send_text(self, data: str) -> None:
        self.sent.append(data)

    async def receive_text(self) -> str:
        await self.disconnected.wait()
        raise WebSocketDisconnect(1001)


async def _relay(messages: list[str], product_id: uuid.UUID | None) -> list[str]:
    socket = FakeSocket()
    relay = asyncio.create_task(relay_prices(socket, FakePubSub(messages), product_id))
    for _ in range(20):  # let the forwarder drain the queued messages
        await asyncio.sleep(0)
    socket.disconnected.set()
    await asyncio.wait_for(relay, timeout=2)  # must end cleanly once the client goes away
    return socket.sent


@pytest.mark.asyncio
async def test_relay_forwards_every_message_and_ignores_non_messages() -> None:
    a, b = uuid.uuid4(), uuid.uuid4()
    sent = await _relay([_message(a, 100.0), _message(b, 50.0)], None)
    assert [json.loads(m)["price"] for m in sent] == [100.0, 50.0]


@pytest.mark.asyncio
async def test_relay_filters_by_product_id() -> None:
    a, b = uuid.uuid4(), uuid.uuid4()
    sent = await _relay([_message(b, 50.0), _message(a, 100.0), "not json"], a)
    assert [json.loads(m)["price"] for m in sent] == [100.0]


def test_ws_endpoint_relays_published_updates() -> None:
    a = uuid.uuid4()
    app.dependency_overrides[get_redis] = lambda: FakeRedis([_message(a, 100.0)])
    try:
        # TestClient cancels the server task as soon as the block exits, which can race
        # the handler's own cleanup; that cancellation is harness noise, not a failure.
        with contextlib.suppress(concurrent.futures.CancelledError):
            with TestClient(app).websocket_connect("/ws/prices") as ws:
                received = json.loads(ws.receive_text())
                assert received["type"] == "price_update" and received["price"] == 100.0
    finally:
        app.dependency_overrides.clear()


def test_ws_closes_when_redis_is_unavailable() -> None:
    class BrokenPubSub(FakePubSub):
        async def subscribe(self, *_channels) -> None:
            raise ConnectionError("redis down")

    class BrokenRedis(FakeRedis):
        def pubsub(self) -> FakePubSub:
            return BrokenPubSub([])

    app.dependency_overrides[get_redis] = lambda: BrokenRedis([])
    try:
        with pytest.raises(Exception) as excinfo:  # noqa: PT011 - starlette raises WebSocketDisconnect
            with TestClient(app).websocket_connect("/ws/prices") as ws:
                ws.receive_text()
        assert excinfo.value.code == 1011
    finally:
        app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_search_finds_a_listing_by_an_equivalent_url(client, db) -> None:
    product, _ = await make_product(db, "Sony", url="http://host.docker.internal:8008/p/sony-wh1000xm5")

    for page_url in [
        "http://localhost:8008/p/sony-wh1000xm5",
        "http://localhost:8008/p/sony-wh1000xm5/?utm_source=newsletter#reviews",
    ]:
        found = (await client.get("/products/search", params={"q": page_url})).json()
        assert [i["id"] for i in found["items"]] == [str(product.id)], page_url

    other = (await client.get("/products/search", params={"q": "http://localhost:8008/p/iphone"})).json()
    assert other["items"] == []
