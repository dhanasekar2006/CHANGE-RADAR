"""Cross-cutting constants shared by the api and worker services."""
from __future__ import annotations

from enum import StrEnum


class MonitorStatus(StrEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"


class FetcherType(StrEnum):
    HTTP = "http"
    BROWSER = "browser"
    FEED = "feed"


class ExtractorType(StrEnum):
    CSS = "css"
    XPATH = "xpath"
    JSONPATH = "jsonpath"
    READABILITY = "readability"


class DiffType(StrEnum):
    TEXT = "text"
    JSON = "json"
    VISUAL = "visual"


class ChangeSignificance(StrEnum):
    NOISE = "noise"
    MINOR = "minor"
    MODERATE = "moderate"
    MAJOR = "major"
    CRITICAL = "critical"


class ChannelType(StrEnum):
    EMAIL = "email"
    SLACK = "slack"
    DISCORD = "discord"
    TELEGRAM = "telegram"
    WEBHOOK = "webhook"


class WorkspaceRole(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class TaskQueue(StrEnum):
    CHECKS = "checks"
    NOTIFICATIONS = "notifications"
    AI = "ai"
    MAINTENANCE = "maintenance"


# --- price tracking ---
PRICE_PUBSUB_CHANNEL = "prices"
"""Redis pub/sub channel the worker publishes price_update messages on and the api's /ws/prices relays."""
DEFAULT_PRICE_CHECK_INTERVAL_SECONDS = 30 * 60

DEFAULT_CHECK_INTERVAL_SECONDS = 15 * 60
MIN_CHECK_INTERVAL_SECONDS = 60
MAX_SNAPSHOT_RETENTION_DAYS = 365
SNAPSHOT_BUCKET_PREFIX = "snapshots"
