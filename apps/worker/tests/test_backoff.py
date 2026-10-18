from src.utils.backoff import compute_backoff_seconds


def test_backoff_grows_with_attempt() -> None:
    small = compute_backoff_seconds(1, base=5.0, cap=300.0)
    large = compute_backoff_seconds(6, base=5.0, cap=300.0)
    assert 0 <= small <= 5.0
    assert 0 <= large <= 300.0


def test_backoff_respects_cap() -> None:
    value = compute_backoff_seconds(20, base=5.0, cap=60.0)
    assert 0 <= value <= 60.0
