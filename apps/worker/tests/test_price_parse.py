from decimal import Decimal

import pytest

from packages.core.pricing import parse_price


@pytest.mark.parametrize(
    ("text", "amount", "currency"),
    [
        ("$1,299.00", "1299.00", "USD"),
        ("Now only £19.99!", "19.99", "GBP"),
        ("1.299,00 €", "1299.00", "EUR"),
        ("₹1,29,999", "129999", "INR"),
        ("12,50 EUR", "12.50", "EUR"),
        ("1 299,00 EUR", "1299.00", "EUR"),
        ("3 left in stock - $19.99", "19.99", "USD"),
        ("Price: 49.5", "49.5", None),
        ("1,299", "1299", None),
        ("Rs. 499", "499", "INR"),
    ],
)
def test_parse_price(text: str, amount: str, currency: str | None) -> None:
    parsed = parse_price(text)
    assert parsed is not None
    assert parsed.amount == Decimal(amount)
    assert parsed.currency == currency


def test_parse_price_returns_none_without_digits() -> None:
    assert parse_price("Out of stock") is None
