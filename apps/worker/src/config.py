from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from packages.core.prices.http import DEFAULT_USER_AGENT
from packages.shared.constants import DEFAULT_PRICE_CHECK_INTERVAL_SECONDS


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    log_level: str = "INFO"

    database_url: str = "postgresql+psycopg://changeradar:changeradar@localhost:5432/changeradar"

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "changeradar"
    s3_secret_key: str = "changeradar-secret"
    s3_bucket: str = "changeradar-snapshots"
    s3_region: str = "us-east-1"

    anthropic_api_key: str = ""
    ai_model: str = "claude-sonnet-5"

    # --- price tracking ---
    price_check_interval_seconds: int = DEFAULT_PRICE_CHECK_INTERVAL_SECONDS
    price_user_agent: str = DEFAULT_USER_AGENT

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "alerts@vilaiwatch.local"
    telegram_bot_token: str = ""

    # WhatsApp Cloud API (Meta). Blank token / phone number id = WhatsApp alerts are skipped.
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_template_name: str = ""
    whatsapp_template_language: str = "en"
    whatsapp_api_version: str = "v25.0"

    snapshot_retention_days: int = 90
    max_concurrent_fetches_per_domain: int = 2


@lru_cache
def get_settings() -> Settings:
    return Settings()
