from __future__ import annotations

import httpx

from packages.core.notifiers.base import NotificationPayload, Notifier
from packages.shared.errors import NotifierError


class SlackNotifier(Notifier):
    """config: {webhook_url}"""

    async def send(self, payload: NotificationPayload) -> None:
        webhook_url = self._config.get("webhook_url")
        if not webhook_url:
            raise NotifierError("slack channel is missing webhook_url")

        body = {
            "text": f"*[{payload.significance.value.upper()}] {payload.monitor_name}*\n"
            f"{payload.change_summary}\n<{payload.change_url}|View diff>"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(webhook_url, json=body)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise NotifierError(f"slack delivery failed: {exc}") from exc
