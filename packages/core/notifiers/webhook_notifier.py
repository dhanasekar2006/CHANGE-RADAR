from __future__ import annotations

from dataclasses import asdict

import httpx

from packages.core.notifiers.base import NotificationPayload, Notifier
from packages.shared.errors import NotifierError


class WebhookNotifier(Notifier):
    """config: {url, headers?}. Posts the payload as JSON for custom integrations."""

    async def send(self, payload: NotificationPayload) -> None:
        url = self._config.get("url")
        if not url:
            raise NotifierError("webhook channel is missing url")

        body = asdict(payload)
        body["significance"] = payload.significance.value

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, json=body, headers=self._config.get("headers") or {})
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise NotifierError(f"webhook delivery failed: {exc}") from exc
