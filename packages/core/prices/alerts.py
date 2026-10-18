from __future__ import annotations

import html
import re
from dataclasses import dataclass
from decimal import Decimal
from email.message import EmailMessage

import aiosmtplib
import httpx

from packages.shared.logging import get_logger

logger = get_logger("core.prices.alerts")

TELEGRAM_API_BASE = "https://api.telegram.org"
WHATSAPP_API_BASE = "https://graph.facebook.com"


@dataclass(frozen=True)
class AlertContext:
    product_name: str
    store: str
    price: Decimal
    target_price: Decimal
    url: str
    user_email: str
    previous_price: Decimal | None = None
    """The listing's price before this check; lets the message say how far it dropped."""


@dataclass(frozen=True)
class DeliveryConfig:
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "alerts@vilaiwatch.local"
    telegram_bot_token: str = ""
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_template_name: str = ""
    """An approved template with 4 body variables, see `_whatsapp_body`. Blank sends plain text."""
    whatsapp_template_language: str = "en"
    whatsapp_api_version: str = "v25.0"


def _inr(amount: Decimal) -> str:
    return f"₹{amount:,.2f}"


def _store_name(store: str) -> str:
    return store.replace("-", " ").replace("_", " ").title()


def drop_summary(ctx: AlertContext) -> str | None:
    """ "was ₹26,990.00, down 7.4%" when the price really fell since the last check, else None."""
    previous = ctx.previous_price
    if previous is None or previous <= ctx.price:
        return None
    percent = (previous - ctx.price) / previous * 100
    return f"was {_inr(previous)}, down {percent:.1f}%"


def format_alert(ctx: AlertContext) -> tuple[str, str]:
    """The plain-text subject and body, shared by email and Telegram."""
    store = _store_name(ctx.store)
    subject = f"Price drop: {ctx.product_name} is now {_inr(ctx.price)} at {store}"

    now_line = f"Now {_inr(ctx.price)} at {store}"
    summary = drop_summary(ctx)
    now_line += f" ({summary})." if summary else "."

    body = f"{ctx.product_name} reached your target of {_inr(ctx.target_price)}.\n\n{now_line}\n{ctx.url}"
    return subject, body


def format_email_html(ctx: AlertContext) -> str:
    """An HTML version of the alert; every dynamic value is escaped."""
    name = html.escape(ctx.product_name)
    store = html.escape(_store_name(ctx.store))
    safe_url = ctx.url if ctx.url.lower().startswith(("http://", "https://")) else "#"
    href = html.escape(safe_url, quote=True)
    summary = drop_summary(ctx)
    summary_html = (
        f'<p style="margin:4px 0 0;color:#047857;font-size:14px">{html.escape(summary)}</p>'
        if summary
        else ""
    )

    return f"""\
<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#14284b">
  <p style="margin:0 0 4px;font-size:13px;color:#555;text-transform:uppercase;letter-spacing:.08em">Price drop</p>
  <h2 style="margin:0 0 12px;font-size:20px">{name}</h2>
  <p style="margin:0;font-size:28px;font-weight:bold">{html.escape(_inr(ctx.price))}</p>
  <p style="margin:4px 0 0;font-size:14px;color:#555">at {store}</p>
  {summary_html}
  <p style="margin:16px 0;font-size:14px">This reached your target of {html.escape(_inr(ctx.target_price))}.</p>
  <p style="margin:0"><a href="{href}" style="display:inline-block;background:#c2410c;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">View deal</a></p>
</div>"""


def format_whatsapp_text(ctx: AlertContext) -> str:
    """A free-form WhatsApp message (*bold* is WhatsApp's own markup)."""
    summary = drop_summary(ctx)
    lines = [
        f"📉 *Price drop!* {ctx.product_name}",
        f"Now *{_inr(ctx.price)}* at {_store_name(ctx.store)}" + (f" ({summary})" if summary else ""),
        f"Your target: {_inr(ctx.target_price)}",
        ctx.url,
    ]
    return "\n".join(lines)


def _template_text(value: str, limit: int = 200) -> str:
    """WhatsApp rejects newlines, tabs and long runs of spaces inside template variables."""
    return " ".join(value.split())[:limit]


def _whatsapp_body(ctx: AlertContext, cfg: DeliveryConfig) -> dict:
    if not cfg.whatsapp_template_name:
        return {"type": "text", "text": {"body": format_whatsapp_text(ctx), "preview_url": True}}

    # Template variables, in order: {{1}} product, {{2}} new price, {{3}} store, {{4}} link.
    values = [ctx.product_name, _inr(ctx.price), _store_name(ctx.store), ctx.url]
    return {
        "type": "template",
        "template": {
            "name": cfg.whatsapp_template_name,
            "language": {"code": cfg.whatsapp_template_language},
            "components": [
                {"type": "body", "parameters": [{"type": "text", "text": _template_text(v)} for v in values]}
            ],
        },
    }


def _whatsapp_error(response: httpx.Response) -> str:
    try:
        error = response.json()["error"]
        return f"{error.get('message', 'unknown error')} (code {error.get('code')})"
    except (ValueError, KeyError, TypeError, AttributeError):
        return response.text[:200]


async def _send_email(ctx: AlertContext, cfg: DeliveryConfig) -> None:
    if not cfg.smtp_host:
        raise RuntimeError("SMTP_HOST is not configured")
    subject, body = format_alert(ctx)
    message = EmailMessage()
    message["From"], message["To"], message["Subject"] = cfg.smtp_from, ctx.user_email, subject
    message.set_content(body)
    message.add_alternative(format_email_html(ctx), subtype="html")
    await aiosmtplib.send(
        message,
        hostname=cfg.smtp_host,
        port=cfg.smtp_port,
        username=cfg.smtp_user or None,
        password=cfg.smtp_password or None,
        start_tls=cfg.smtp_port != 25,
    )


async def _send_telegram(ctx: AlertContext, cfg: DeliveryConfig, chat_id: str) -> None:
    if not cfg.telegram_bot_token or not chat_id:
        raise RuntimeError("TELEGRAM_BOT_TOKEN / chat_id is not configured")
    subject, body = format_alert(ctx)
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{TELEGRAM_API_BASE}/bot{cfg.telegram_bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": f"{subject}\n\n{body}"},
        )
        response.raise_for_status()


async def _send_whatsapp(ctx: AlertContext, cfg: DeliveryConfig, phone: str) -> None:
    """Send through the WhatsApp Cloud API (Meta)."""
    to = re.sub(r"\D", "", phone)
    if not cfg.whatsapp_access_token or not cfg.whatsapp_phone_number_id or not to:
        raise RuntimeError("WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID / phone is not configured")

    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        **_whatsapp_body(ctx, cfg),
    }
    url = f"{WHATSAPP_API_BASE}/{cfg.whatsapp_api_version}/{cfg.whatsapp_phone_number_id}/messages"
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            url, json=payload, headers={"Authorization": f"Bearer {cfg.whatsapp_access_token}"}
        )
    if response.status_code >= 400:
        # Meta's own message says what is wrong (bad token, number not allowed, template not approved, ...).
        raise RuntimeError(f"WhatsApp API {response.status_code}: {_whatsapp_error(response)}")


async def deliver_alert(channels: list[dict], ctx: AlertContext, cfg: DeliveryConfig) -> bool:
    """Send `ctx` on every configured channel; True if the alert should count as delivered.

    One channel failing doesn't stop the others. With no channels configured
    the alert is in-app only (the frontend toasts from the live price feed),
    so there is nothing to retry and it counts as delivered. If channels are
    configured and *all* fail, returns False so the caller leaves the alert
    armed and the next price check retries it.
    """
    if not channels:
        return True

    delivered = False
    for channel in channels:
        kind = channel.get("type")
        try:
            if kind == "email":
                await _send_email(ctx, cfg)
            elif kind == "telegram":
                await _send_telegram(ctx, cfg, str(channel.get("chat_id", "")))
            elif kind == "whatsapp":
                await _send_whatsapp(ctx, cfg, str(channel.get("phone", "")))
            else:
                logger.warning("unknown alert channel", extra={"extra_fields": {"channel": kind}})
                continue
            delivered = True
        except Exception as exc:  # noqa: BLE001 - one bad channel must not block the rest
            logger.warning(
                "alert delivery failed", extra={"extra_fields": {"channel": kind, "error": str(exc)}}
            )
    return delivered
