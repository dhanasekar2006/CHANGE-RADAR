from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

_SYMBOLS = {"$": "USD", "€": "EUR", "£": "GBP", "₹": "INR", "¥": "JPY", "Rs.": "INR", "Rs": "INR"}
_CODES = ("USD", "EUR", "GBP", "INR", "JPY", "CAD", "AUD", "CNY", "CHF", "SGD", "AED")

_CURRENCY = (
    r"(?:"
    + "|".join(re.escape(s) for s in sorted(_SYMBOLS, key=len, reverse=True))
    + "|"
    + "|".join(_CODES)
    + r")"
)
# Digits with optional , . or space group separators:
# 1,299.00 / 1.299,00 / 1 299,00 / 12.50
# A plain space only counts as a separator between 3-digit groups ("1 299"),
# so "3 left" or "2 items" don't glue onto a following number.
_NUMBER = r"\d{1,3}(?:[   ]\d{3})+(?:[.,]\d+)?|\d(?:[\d.,  ]*\d)?"
_PRICE_RE = re.compile(
    rf"(?P<pre>{_CURRENCY})?\s*(?P<num>{_NUMBER})\s*(?P<post>{_CURRENCY})?",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class ParsedPrice:
    amount: Decimal
    currency: str | None  # ISO 4217 code, None when the text shows no currency


def _normalize_currency(token: str | None) -> str | None:
    if not token:
        return None
    for symbol, code in _SYMBOLS.items():
        if token.lower() == symbol.lower():
            return code
    return token.upper()


def _to_decimal(raw: str) -> Decimal | None:
    s = re.sub(r"[   ]", "", raw)
    last_dot, last_comma = s.rfind("."), s.rfind(",")

    if last_dot != -1 and last_comma != -1:
        decimal_sep = "." if last_dot > last_comma else ","
    elif last_dot != -1 or last_comma != -1:
        sep = "." if last_dot != -1 else ","
        # "1,299" / "1.299.000" -> thousands; "12,50" / "12.5" -> decimal
        decimal_sep = sep if s.count(sep) == 1 and len(s) - s.rfind(sep) - 1 != 3 else None
    else:
        decimal_sep = None

    if decimal_sep:
        integer, _, fraction = s.rpartition(decimal_sep)
        s = re.sub(r"[.,]", "", integer) + "." + fraction
    else:
        s = re.sub(r"[.,]", "", s)

    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def parse_price(text: str) -> ParsedPrice | None:
    """Pull the first price out of extracted page text.

    Prefers a number that sits next to a currency symbol/code ("$1,299.00",
    "1.299,00 EUR") over a bare number, so "3 left in stock - $19.99" yields
    19.99 rather than 3. Returns None when no number is found.
    """
    fallback: ParsedPrice | None = None
    for match in _PRICE_RE.finditer(text):
        amount = _to_decimal(match.group("num"))
        if amount is None:
            continue
        currency = _normalize_currency(match.group("pre") or match.group("post"))
        if currency:
            return ParsedPrice(amount=amount, currency=currency)
        if fallback is None:
            fallback = ParsedPrice(amount=amount, currency=None)
    return fallback
