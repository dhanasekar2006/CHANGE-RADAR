from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.middleware.error_handler import register_error_handlers
from src.middleware.rate_limit import RateLimitMiddleware
from src.middleware.request_id import RequestIDMiddleware
from src.routers import (
    alerts,
    auth,
    changes,
    channels,
    deals,
    health,
    monitors,
    products,
    snapshots,
    workspaces,
    ws,
)
from packages.shared.logging import configure_logging


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging("api", settings.log_level)

    app = FastAPI(title="ChangeRadar API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware, redis_url=settings.redis_url)
    app.add_middleware(RequestIDMiddleware)

    register_error_handlers(app)

    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(workspaces.router)
    app.include_router(monitors.router)
    app.include_router(changes.router)
    app.include_router(snapshots.router)
    app.include_router(channels.router)
    app.include_router(products.router)
    app.include_router(deals.router)
    app.include_router(alerts.router)
    app.include_router(ws.router)

    return app


app = create_app()
