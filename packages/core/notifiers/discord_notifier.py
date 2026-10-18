from __future__ import annotations

import httpx

from packages.core.notifiers.base import NotificationPayload, Notifier
from packages.shared.errors import NotifierError


class DiscordNotifier(Notifier):
    """config: {webhook_url}"""

    async def send(self, payload: NotificationPayload) -> None:
        webhook_url = self._config.get("webhook_url")
        if not webhook_url:
            raise NotifierError("discord channel is missing webhook_url")

        body = {
            "content": (
                f"**[{payload.significance.value.upper()}] {payload.monitor_name}**\n"
                f"{payload.change_summary}\n{payload.change_url}"
            )
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(webhook_url, json=body)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise NotifierError(f"discord delivery failed: {exc}") from exc
