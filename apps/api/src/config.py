from __future__ import annotations

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    log_level: str = "INFO"

    secret_key: str = "change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 14
    jwt_algorithm: str = "HS256"

    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:5173"

    database_url: str = "postgresql+asyncpg://changeradar:changeradar@localhost:5432/changeradar"

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

    @model_validator(mode="after")
    def _require_real_secret_in_production(self) -> "Settings":
        if self.environment == "production" and (self.secret_key == "change-me" or len(self.secret_key) < 32):
            raise ValueError("SECRET_KEY must be set to a random value of at least 32 characters in production")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
