from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from packages.shared.errors import ValidationError

RANGE_DAYS = {"1M": 30, "3M": 90, "6M": 180}
DEFAULT_RANGE = "1M"
DEAL_WINDOW_DAYS = 30


def as_utc(dt: datetime) -> datetime:
    """SQLite (used in tests) returns naive datetimes; Postgres returns aware ones."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def range_start(range_key: str, now: datetime) -> datetime:
    try:
        return as_utc(now) - timedelta(days=RANGE_DAYS[range_key.upper()])
    except KeyError:
        raise ValidationError(f"range must be one of {', '.join(RANGE_DAYS)}", range=range_key) from None


def time_weighted_average(
    points: list[tuple[datetime, Decimal]], start: datetime, end: datetime
) -> Decimal | None:
    """Average price over [start, end], weighting each price by how long it was in effect.

    Prices are only stored when they change, so a plain mean of the rows would
    over-weight volatile periods and ignore that a price held for three weeks
    counts for more than one that lasted an hour. `points` is (checked_at,
    price) sorted ascending and may include points before `start`; the latest
    of those sets the price in effect when the window opens.
    """
    start, end = as_utc(start), as_utc(end)
    level: Decimal | None = None
    cursor = start
    weighted = Decimal(0)
    span = 0.0

    for checked_at, price in points:
        t = as_utc(checked_at)
        if t <= start:
            level = price
            continue
        if t >= end:
            break
        if level is not None:
            seconds = (t - cursor).total_seconds()
            weighted += level * Decimal(seconds)
            span += seconds
        level, cursor = price, t

    if level is None:
        return None
    tail = (end - cursor).total_seconds()
    weighted += level * Decimal(tail)
    span += tail

    if span <= 0:
        return level
    return (weighted / Decimal(span)).quantize(Decimal("0.01"))
