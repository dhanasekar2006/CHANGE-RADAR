from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from packages.shared.errors import ChangeRadarError

logger = logging.getLogger("api.errors")


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ChangeRadarError)
    async def handle_domain_error(request: Request, exc: ChangeRadarError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None)
        if exc.http_status >= 500:
            logger.exception("unhandled domain error", extra={"extra_fields": {"code": exc.code}})

        return JSONResponse(
            status_code=exc.http_status,
            content={
                "code": exc.code,
                "message": exc.message,
                "request_id": request_id,
            },
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", None)
        logger.exception("unhandled exception", extra={"extra_fields": {"request_id": request_id}})

        return JSONResponse(
            status_code=500,
            content={"code": "internal_error", "message": "an unexpected error occurred", "request_id": request_id},
        )
