import asyncio
import json
from decimal import Decimal

import httpx
import pytest

from packages.core.prices import alerts
from packages.core.prices.alerts import (
    AlertContext,
    DeliveryConfig,
    deliver_alert,
    drop_summary,
    format_alert,
    format_email_html,
    format_whatsapp_text,
)

CTX = AlertContext(
    product_name="Sony WH-1000XM5",
    store="examplemart",
    price=Decimal("24990.00"),
    target_price=Decimal("25000"),
    url="https://examplemart.in/p/sony-xm5",
    user_email="buyer@example.com",
    previous_price=Decimal("26990.00"),
)

WA = DeliveryConfig(whatsapp_access_token="TOKEN123", whatsapp_phone_number_id="555000111")
PHONE = {"type": "whatsapp", "phone": "+919876543210"}


def run(coro):
    return asyncio.run(coro)


# --- the generated message ------------------------------------------------------------------


def test_drop_summary_says_how_far_the_price_fell() -> None:
    assert drop_summary(CTX) == "was ₹26,990.00, down 7.4%"


@pytest.mark.parametrize("previous", [None, Decimal("24990.00"), Decimal("20000")])
def test_no_drop_summary_without_an_actual_drop(previous) -> None:
    assert drop_summary(AlertContext(**{**CTX.__dict__, "previous_price": previous})) is None


def test_email_text_has_price_drop_store_and_link() -> None:
    subject, body = format_alert(CTX)
    assert subject == "Price drop: Sony WH-1000XM5 is now ₹24,990.00 at Examplemart"
    assert "Now ₹24,990.00 at Examplemart (was ₹26,990.00, down 7.4%)." in body
    assert "target of ₹25,000.00" in body and CTX.url in body


def test_whatsapp_text_message() -> None:
    text = format_whatsapp_text(CTX)
    assert text.splitlines() == [
        "📉 *Price drop!* Sony WH-1000XM5",
        "Now *₹24,990.00* at Examplemart (was ₹26,990.00, down 7.4%)",
        "Your target: ₹25,000.00",
        "https://examplemart.in/p/sony-xm5",
    ]


def test_email_html_escapes_everything_dynamic() -> None:
    nasty = AlertContext(
        **{
            **CTX.__dict__,
            "product_name": "<script>alert(1)</script>",
            "url": 'https://x.test/"onmouseover="x',
        }
    )
    page = format_email_html(nasty)
    assert "<script>" not in page and "&lt;script&gt;" in page
    assert '"onmouseover="x' not in page


def test_email_html_refuses_a_non_http_link() -> None:
    page = format_email_html(AlertContext(**{**CTX.__dict__, "url": "javascript:alert(1)"}))
    assert "javascript:" not in page and 'href="#"' in page


# --- email: plain text + HTML ---------------------------------------------------------------


def test_email_is_multipart_with_text_and_html(monkeypatch: pytest.MonkeyPatch) -> None:
    sent = {}

    async def fake_send(message, **kwargs):
        sent["message"], sent["kwargs"] = message, kwargs

    monkeypatch.setattr(alerts.aiosmtplib, "send", fake_send)
    cfg = DeliveryConfig(smtp_host="smtp.test", smtp_port=587, smtp_user="u", smtp_password="p")

    assert run(deliver_alert([{"type": "email"}], CTX, cfg)) is True

    message = sent["message"]
    assert message["To"] == "buyer@example.com" and message["Subject"].startswith("Price drop:")
    types = [part.get_content_type() for part in message.walk()]
    assert types == ["multipart/alternative", "text/plain", "text/html"]
    assert "down 7.4%" in message.get_body(("plain",)).get_content()
    assert "down 7.4%" in message.get_body(("html",)).get_content()
    assert sent["kwargs"]["hostname"] == "smtp.test" and sent["kwargs"]["start_tls"] is True


def test_email_without_smtp_host_fails_so_the_alert_stays_armed() -> None:
    assert run(deliver_alert([{"type": "email"}], CTX, DeliveryConfig())) is False


# --- WhatsApp -------------------------------------------------------------------------------


def patch_whatsapp(monkeypatch: pytest.MonkeyPatch, handler) -> list[httpx.Request]:
    seen: list[httpx.Request] = []

    def recording(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return handler(request)

    real = httpx.AsyncClient
    monkeypatch.setattr(
        alerts.httpx, "AsyncClient", lambda **kw: real(transport=httpx.MockTransport(recording), **kw)
    )
    return seen


def ok(_request: httpx.Request) -> httpx.Response:
    return httpx.Response(200, json={"messaging_product": "whatsapp", "messages": [{"id": "wamid.X"}]})


def test_whatsapp_plain_text_request(monkeypatch: pytest.MonkeyPatch) -> None:
    seen = patch_whatsapp(monkeypatch, ok)

    assert run(deliver_alert([PHONE], CTX, WA)) is True

    request = seen[0]
    assert str(request.url) == "https://graph.facebook.com/v25.0/555000111/messages"
    assert request.headers["authorization"] == "Bearer TOKEN123"
    body = json.loads(request.content)
    assert body["messaging_product"] == "whatsapp" and body["to"] == "919876543210"  # digits only
    assert body["type"] == "text" and body["text"]["body"] == format_whatsapp_text(CTX)


def test_whatsapp_template_request(monkeypatch: pytest.MonkeyPatch) -> None:
    seen = patch_whatsapp(monkeypatch, ok)
    cfg = DeliveryConfig(
        **{**WA.__dict__, "whatsapp_template_name": "price_drop_alert", "whatsapp_template_language": "en_US"}
    )

    assert run(deliver_alert([PHONE], CTX, cfg)) is True

    body = json.loads(seen[0].content)
    assert body["type"] == "template" and "text" not in body
    template = body["template"]
    assert template["name"] == "price_drop_alert" and template["language"] == {"code": "en_US"}
    assert template["components"] == [
        {
            "type": "body",
            "parameters": [
                {"type": "text", "text": "Sony WH-1000XM5"},
                {"type": "text", "text": "₹24,990.00"},
                {"type": "text", "text": "Examplemart"},
                {"type": "text", "text": "https://examplemart.in/p/sony-xm5"},
            ],
        }
    ]


def test_template_variables_have_no_newlines_or_long_space_runs(monkeypatch: pytest.MonkeyPatch) -> None:
    seen = patch_whatsapp(monkeypatch, ok)
    messy = AlertContext(**{**CTX.__dict__, "product_name": "Sony\nWH-1000XM5\t\tBlack     Edition"})
    cfg = DeliveryConfig(**{**WA.__dict__, "whatsapp_template_name": "t"})

    run(deliver_alert([PHONE], messy, cfg))

    first = json.loads(seen[0].content)["template"]["components"][0]["parameters"][0]["text"]
    assert first == "Sony WH-1000XM5 Black Edition"


def test_whatsapp_uses_the_configured_api_version(monkeypatch: pytest.MonkeyPatch) -> None:
    seen = patch_whatsapp(monkeypatch, ok)
    run(deliver_alert([PHONE], CTX, DeliveryConfig(**{**WA.__dict__, "whatsapp_api_version": "v26.0"})))
    assert "/v26.0/" in str(seen[0].url)


def test_whatsapp_api_error_is_reported_and_alert_stays_armed(
    monkeypatch: pytest.MonkeyPatch, caplog
) -> None:
    def rejected(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            400, json={"error": {"message": "Recipient phone number not in allowed list", "code": 131030}}
        )

    patch_whatsapp(monkeypatch, rejected)
    with pytest.raises(RuntimeError, match=r"131030"):
        run(alerts._send_whatsapp(CTX, WA, "+919876543210"))
    assert run(deliver_alert([PHONE], CTX, WA)) is False


def test_whatsapp_non_json_error_body_is_truncated() -> None:
    message = alerts._whatsapp_error(httpx.Response(502, text="x" * 500))
    assert message == "x" * 200


def test_whatsapp_not_configured_fails_without_calling_the_api(monkeypatch: pytest.MonkeyPatch) -> None:
    seen = patch_whatsapp(monkeypatch, ok)
    assert run(deliver_alert([PHONE], CTX, DeliveryConfig())) is False
    assert run(deliver_alert([{"type": "whatsapp"}], CTX, WA)) is False  # no phone stored
    assert seen == []


def test_access_token_never_appears_in_the_error(monkeypatch: pytest.MonkeyPatch) -> None:
    patch_whatsapp(
        monkeypatch,
        lambda r: httpx.Response(401, json={"error": {"message": "Invalid OAuth access token", "code": 190}}),
    )
    with pytest.raises(RuntimeError) as info:
        run(alerts._send_whatsapp(CTX, WA, "+919876543210"))
    assert "TOKEN123" not in str(info.value)


# --- several channels ---------------------------------------------------------------------


def test_one_failing_channel_does_not_block_the_others(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    async def fake_email(ctx, cfg):
        calls.append("email")

    async def broken_whatsapp(ctx, cfg, phone):
        calls.append("whatsapp")
        raise RuntimeError("boom")

    monkeypatch.setattr(alerts, "_send_email", fake_email)
    monkeypatch.setattr(alerts, "_send_whatsapp", broken_whatsapp)

    assert run(deliver_alert([PHONE, {"type": "email"}], CTX, WA)) is True  # email still got through
    assert calls == ["whatsapp", "email"]


def test_all_channels_failing_leaves_the_alert_armed(monkeypatch: pytest.MonkeyPatch) -> None:
    async def broken(*_args):
        raise RuntimeError("boom")

    monkeypatch.setattr(alerts, "_send_email", broken)
    monkeypatch.setattr(alerts, "_send_whatsapp", broken)
    assert run(deliver_alert([PHONE, {"type": "email"}], CTX, WA)) is False


def test_no_channels_counts_as_delivered() -> None:
    assert run(deliver_alert([], CTX, DeliveryConfig())) is True
