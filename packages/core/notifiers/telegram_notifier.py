from __future__ import annotations

import httpx

from packages.core.notifiers.base import NotificationPayload, Notifier
from packages.shared.errors import NotifierError

TELEGRAM_API_BASE = "https://api.telegram.org"


class TelegramNotifier(Notifier):
    """config: {bot_token, chat_id}"""

    async def send(self, payload: NotificationPayload) -> None:
        bot_token = self._config.get("bot_token")
        chat_id = self._config.get("chat_id")
        if not bot_token or not chat_id:
            raise NotifierError("telegram channel is missing bot_token/chat_id")

        text = (
            f"[{payload.significance.value.upper()}] {payload.monitor_name}\n"
            f"{payload.change_summary}\n{payload.change_url}"
        )

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{TELEGRAM_API_BASE}/bot{bot_token}/sendMessage",
                    json={"chat_id": chat_id, "text": text},
                )
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise NotifierError(f"telegram delivery failed: {exc}") from exc
