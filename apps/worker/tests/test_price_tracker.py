from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session

from packages.core.models import PriceAlert, PricePoint, Product, StoreListing, User
from packages.core.prices.base import PriceResult
from packages.core.prices.history import range_start, time_weighted_average
from packages.core.prices.tracker import apply_result, trigger_alerts
from packages.core.testing import make_sqlite_engine
from packages.shared.errors import ValidationError

T0 = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)


@pytest.fixture
def session():
    with Session(make_sqlite_engine()) as s:
        yield s


@pytest.fixture
def listing(session: Session) -> StoreListing:
    product = Product(name="Sony WH-1000XM5", category="headphones")
    session.add(product)
    session.flush()
    row = StoreListing(product_id=product.id, store="demo", url="http://localhost:8008/p/1")
    session.add(row)
    session.commit()
    return row


def _points(session: Session, listing: StoreListing) -> list[Decimal]:
    rows = session.scalars(
        select(PricePoint).where(PricePoint.listing_id == listing.id).order_by(PricePoint.checked_at)
    )
    return [r.price for r in rows]


def _check(session, listing, price: str, minutes: int = 0, in_stock: bool = True):
    update = apply_result(
        session, listing, PriceResult(Decimal(price), in_stock), T0 + timedelta(minutes=minutes)
    )
    session.commit()
    return update


# --- save only on change ------------------------------------------------------


def test_first_check_saves_a_price_point(session, listing) -> None:
    update = _check(session, listing, "24990.00")
    assert update.changed and update.old_price is None
    assert _points(session, listing) == [Decimal("24990.00")]
    assert listing.current_price == Decimal("24990.00")


def test_unchanged_price_does_not_add_a_point_but_refreshes_checked_at(session, listing) -> None:
    _check(session, listing, "24990.00", minutes=0)
    update = _check(session, listing, "24990.00", minutes=30)
    assert not update.changed
    assert len(_points(session, listing)) == 1
    assert listing.last_checked_at.replace(tzinfo=timezone.utc) == T0 + timedelta(minutes=30)


def test_changed_price_adds_a_point_and_reports_old_price(session, listing) -> None:
    _check(session, listing, "24990.00", minutes=0)
    update = _check(session, listing, "22990.00", minutes=30)
    assert update.changed and update.old_price == Decimal("24990.00")
    assert _points(session, listing) == [Decimal("24990.00"), Decimal("22990.00")]
    assert listing.current_price == Decimal("22990.00")


def test_stock_flag_updates_without_a_price_change(session, listing) -> None:
    _check(session, listing, "24990.00")
    _check(session, listing, "24990.00", minutes=30, in_stock=False)
    assert listing.in_stock is False
    assert len(_points(session, listing)) == 1


def test_update_message_shape(session, listing) -> None:
    _check(session, listing, "24990.00")
    message = _check(session, listing, "22990.50", minutes=30).to_message()
    assert message["type"] == "price_update"
    assert message["product_id"] == str(listing.product_id)
    assert message["store"] == "demo"
    assert message["price"] == 22990.5 and message["old_price"] == 24990.0
    assert message["checked_at"] == (T0 + timedelta(minutes=30)).isoformat()


# --- alerts ---------------------------------------------------------------------


@pytest.fixture
def alert_factory(session, listing):
    user = User(email="buyer@example.com", hashed_password="x")
    session.add(user)
    session.flush()

    def make(target: str) -> PriceAlert:
        alert = PriceAlert(user_id=user.id, product_id=listing.product_id, target_price=Decimal(target), channels=[])
        session.add(alert)
        session.commit()
        return alert

    return make


class Sender:
    def __init__(self, ok: bool = True) -> None:
        self.ok, self.calls = ok, []

    def __call__(self, alert, ctx) -> bool:
        self.calls.append((alert.id, ctx))
        return self.ok


def test_alert_fires_when_price_reaches_target(session, listing, alert_factory) -> None:
    alert = alert_factory("23000")
    sender = Sender()
    update = _check(session, listing, "22990.00")

    fired = trigger_alerts(session, update, sender, listing.url)

    assert fired == [alert]
    assert alert.triggered_at is not None
    assert sender.calls[0][1].price == Decimal("22990.00")
    assert sender.calls[0][1].user_email == "buyer@example.com"


def test_alert_message_knows_the_price_before_the_drop(session, listing, alert_factory) -> None:
    _check(session, listing, "24990.00", minutes=0)
    alert_factory("23000")
    sender = Sender()
    update = _check(session, listing, "22990.00", minutes=30)

    trigger_alerts(session, update, sender, listing.url)

    assert sender.calls[0][1].previous_price == Decimal("24990.00")


def test_alert_fires_at_exactly_the_target(session, listing, alert_factory) -> None:
    alert = alert_factory("22990")
    update = _check(session, listing, "22990.00")
    assert trigger_alerts(session, update, Sender(), listing.url) == [alert]


def test_alert_does_not_fire_above_target(session, listing, alert_factory) -> None:
    alert = alert_factory("20000")
    sender = Sender()
    update = _check(session, listing, "22990.00")

    assert trigger_alerts(session, update, sender, listing.url) == []
    assert alert.triggered_at is None and sender.calls == []


def test_alert_fires_only_once(session, listing, alert_factory) -> None:
    alert_factory("23000")
    sender = Sender()
    first = _check(session, listing, "22990.00", minutes=0)
    trigger_alerts(session, first, sender, listing.url)
    second = _check(session, listing, "21990.00", minutes=30)
    trigger_alerts(session, second, sender, listing.url)

    assert len(sender.calls) == 1


def test_failed_delivery_leaves_alert_armed_for_the_next_check(session, listing, alert_factory) -> None:
    alert = alert_factory("23000")
    update = _check(session, listing, "22990.00", minutes=0)
    assert trigger_alerts(session, update, Sender(ok=False), listing.url) == []
    assert alert.triggered_at is None

    retry = _check(session, listing, "22990.00", minutes=30)
    assert trigger_alerts(session, retry, Sender(ok=True), listing.url) == [alert]
    assert alert.triggered_at is not None


def test_out_of_stock_never_triggers(session, listing, alert_factory) -> None:
    alert = alert_factory("23000")
    update = _check(session, listing, "22990.00", in_stock=False)
    assert trigger_alerts(session, update, Sender(), listing.url) == []
    assert alert.triggered_at is None


def test_alert_for_a_price_already_below_target_fires_on_next_check(session, listing, alert_factory) -> None:
    _check(session, listing, "22990.00", minutes=0)
    alert = alert_factory("23000")  # created after the price was already low
    update = _check(session, listing, "22990.00", minutes=30)  # unchanged price
    assert trigger_alerts(session, update, Sender(), listing.url) == [alert]


# --- history helpers -------------------------------------------------------------


@pytest.mark.parametrize(("key", "days"), [("1M", 30), ("3M", 90), ("6M", 180), ("3m", 90)])
def test_range_start(key: str, days: int) -> None:
    assert range_start(key, T0) == T0 - timedelta(days=days)


def test_range_start_rejects_unknown_range() -> None:
    with pytest.raises(ValidationError):
        range_start("1Y", T0)


def test_time_weighted_average_weights_by_duration() -> None:
    start, end = T0, T0 + timedelta(days=10)
    points = [(start, Decimal("100")), (start + timedelta(days=9), Decimal("50"))]
    # 100 for 9 days, 50 for 1 day -> 95, not the plain mean of 75
    assert time_weighted_average(points, start, end) == Decimal("95.00")


def test_time_weighted_average_uses_price_in_effect_when_window_opens() -> None:
    start, end = T0, T0 + timedelta(days=10)
    points = [(start - timedelta(days=20), Decimal("200")), (start + timedelta(days=5), Decimal("100"))]
    assert time_weighted_average(points, start, end) == Decimal("150.00")


def test_time_weighted_average_with_no_data() -> None:
    assert time_weighted_average([], T0, T0 + timedelta(days=1)) is None
