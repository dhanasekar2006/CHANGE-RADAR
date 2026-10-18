"""Error taxonomy shared by the api and worker services.

Routers/tasks raise these; the api's error-handling middleware and the
worker's task-failure handling both know how to translate them into a
consistent shape (HTTP responses on one side, retry/dead-letter decisions
on the other).
"""
from __future__ import annotations


class ChangeRadarError(Exception):
    """Base class for all application errors. Carries a stable error code."""

    code = "internal_error"
    http_status = 500

    def __init__(self, message: str | None = None, **context: object) -> None:
        super().__init__(message or self.code)
        self.message = message or self.code
        self.context = context


class NotFoundError(ChangeRadarError):
    code = "not_found"
    http_status = 404


class ValidationError(ChangeRadarError):
    code = "validation_error"
    http_status = 422


class AuthenticationError(ChangeRadarError):
    code = "authentication_error"
    http_status = 401


class AuthorizationError(ChangeRadarError):
    code = "authorization_error"
    http_status = 403


class ConflictError(ChangeRadarError):
    code = "conflict"
    http_status = 409


class RateLimitedError(ChangeRadarError):
    code = "rate_limited"
    http_status = 429


class FetchError(ChangeRadarError):
    """Raised by packages/core fetchers when a source can't be retrieved."""

    code = "fetch_error"
    http_status = 502


class RobotsDisallowedError(FetchError):
    """The site's robots.txt forbids fetching this URL for our user agent. Not retryable."""

    code = "robots_disallowed"


class ExtractionError(ChangeRadarError):
    """Raised by packages/core extractors when a selector/rule fails to match."""

    code = "extraction_error"
    http_status = 422


class NotifierError(ChangeRadarError):
    """Raised by packages/core notifiers when delivery to a channel fails."""

    code = "notifier_error"
    http_status = 502
