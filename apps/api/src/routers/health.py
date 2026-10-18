from __future__ import annotations

import os

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def liveness() -> dict:
    return {"status": "ok"}


@router.get("/health/ready")
async def readiness() -> dict:
    # Extend with real dependency pings (db, redis) once those clients are
    # wired through a shared health-check helper.
    return {"status": "ok"}


@router.get("/health/build")
async def build_info() -> dict:
    return {
        "version": os.environ.get("BUILD_VERSION", "dev"),
        "commit": os.environ.get("BUILD_COMMIT", "unknown"),
    }
