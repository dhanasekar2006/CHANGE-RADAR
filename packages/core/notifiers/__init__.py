from packages.core.notifiers.base import Notifier, NotificationPayload
from packages.core.notifiers.discord_notifier import DiscordNotifier
from packages.core.notifiers.email_notifier import EmailNotifier
from packages.core.notifiers.slack_notifier import SlackNotifier
from packages.core.notifiers.telegram_notifier import TelegramNotifier
from packages.core.notifiers.webhook_notifier import WebhookNotifier
from packages.shared.constants import ChannelType

NOTIFIER_REGISTRY: dict[ChannelType, type[Notifier]] = {
    ChannelType.EMAIL: EmailNotifier,
    ChannelType.SLACK: SlackNotifier,
    ChannelType.DISCORD: DiscordNotifier,
    ChannelType.TELEGRAM: TelegramNotifier,
    ChannelType.WEBHOOK: WebhookNotifier,
}

__all__ = [
    "Notifier",
    "NotificationPayload",
    "EmailNotifier",
    "SlackNotifier",
    "DiscordNotifier",
    "TelegramNotifier",
    "WebhookNotifier",
    "NOTIFIER_REGISTRY",
]
