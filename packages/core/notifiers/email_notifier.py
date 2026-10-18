from __future__ import annotations

from email.message import EmailMessage

import aiosmtplib

from packages.core.notifiers.base import NotificationPayload, Notifier
from packages.shared.errors import NotifierError


class EmailNotifier(Notifier):
    """config: {smtp_host, smtp_port, smtp_user, smtp_password, from_addr, to_addr}"""

    async def send(self, payload: NotificationPayload) -> None:
        message = EmailMessage()
        message["From"] = self._config.get("from_addr")
        message["To"] = self._config.get("to_addr")
        message["Subject"] = f"[{payload.significance.value.upper()}] {payload.monitor_name} changed"
        message.set_content(
            f"{payload.monitor_name} ({payload.monitor_url}) changed:\n\n"
            f"{payload.change_summary}\n\nView the diff: {payload.change_url}"
        )

        try:
            await aiosmtplib.send(
                message,
                hostname=self._config.get("smtp_host"),
                port=int(self._config.get("smtp_port", 587)),
                username=self._config.get("smtp_user"),
                password=self._config.get("smtp_password"),
                start_tls=True,
            )
        except Exception as exc:  # noqa: BLE001
            raise NotifierError(f"email delivery failed: {exc}") from exc
