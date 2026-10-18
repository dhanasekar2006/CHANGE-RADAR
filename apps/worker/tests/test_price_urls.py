import pytest

from packages.core.prices.urls import path_needle, url_key


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("https://shop.example/p/sony?utm_source=x&gclid=1", "https://shop.example/p/sony"),
        ("http://shop.example/p/sony", "https://shop.example/p/sony"),
        ("https://www.shop.example/p/sony/", "https://shop.example/p/sony"),
        ("https://SHOP.example/p/sony#reviews", "https://shop.example/p/sony"),
        ("https://shop.example:443/p/sony", "https://shop.example/p/sony"),
        ("https://shop.example/p?b=2&a=1", "https://shop.example/p?a=1&b=2"),
        ("http://localhost:8008/p/sony", "http://host.docker.internal:8008/p/sony"),
        ("http://127.0.0.1:8008/p/sony", "http://localhost:8008/p/sony"),
    ],
)
def test_equivalent_urls_share_a_key(a: str, b: str) -> None:
    assert url_key(a) == url_key(b)


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("https://shop.example/p/sony", "https://shop.example/p/apple"),
        ("https://shop.example/p?id=1", "https://shop.example/p?id=2"),
        ("https://a.example/p/sony", "https://b.example/p/sony"),
        ("http://localhost:8008/p/sony", "http://localhost:9000/p/sony"),
    ],
)
def test_different_pages_have_different_keys(a: str, b: str) -> None:
    assert url_key(a) != url_key(b)


def test_path_needle() -> None:
    assert path_needle("https://shop.example/p/sony/?x=1") == "sony"
    assert path_needle("https://shop.example/") == ""
