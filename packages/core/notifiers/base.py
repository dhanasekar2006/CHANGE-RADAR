from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from packages.shared.constants import ChangeSignificance


@dataclass
class NotificationPayload:
    monitor_name: str
    monitor_url: str
    change_summary: str
    significance: ChangeSignificance
    change_url: str
    """Link back into the ChangeRadar dashboard for this change."""


class Notifier(ABC):
    """Delivers one NotificationPayload to a channel's configured destination.

    `config` is the Channel.config JSON blob (webhook URL, bot token, etc.),
    validated by each implementation.
    """

    def __init__(self, config: dict) -> None:
        self._config = config

    @abstractmethod
    async def send(self, payload: NotificationPayload) -> None:
        raise NotImplementedError
