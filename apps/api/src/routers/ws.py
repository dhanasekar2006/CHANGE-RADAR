from __future__ import annotations

import asyncio
import json
import uuid
from typing import Annotated, Any

import redis.asyncio as redis
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from src.config import Settings, get_settings
from packages.shared.constants import PRICE_PUBSUB_CHANNEL
from packages.shared.logging import get_logger

router = APIRouter(tags=["prices"])
logger = get_logger("api.ws")


def get_redis(settings: Annotated[Settings, Depends(get_settings)]) -> redis.Redis:
    return redis.from_url(settings.redis_url, decode_responses=True)


async def relay_prices(websocket: WebSocket, pubsub: Any, product_id: uuid.UUID | None) -> None:
    """Forward Redis "prices" messages to the socket until either side goes away.

    With `product_id`, only that product's updates are sent. The receive loop
    exists purely to notice the client disconnecting; clients send nothing.
    """

    async def forward() -> None:
        async for message in pubsub.listen():
            if message.get("type") != "message":
                continue
            data = message["data"]
            if product_id is not None:
                try:
                    if json.loads(data).get("product_id") != str(product_id):
                        continue
                except ValueError:
                    continue
            await websocket.send_text(data)

    async def watch_disconnect() -> None:
        while True:
            await websocket.receive_text()

    tasks = [asyncio.create_task(forward()), asyncio.create_task(watch_disconnect())]
    try:
        done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in done:
            exc = task.exception()
            if exc is not None and not isinstance(exc, WebSocketDisconnect):
                raise exc
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


@router.websocket("/ws/prices")
async def prices_socket(
    websocket: WebSocket,
    client: Annotated[redis.Redis, Depends(get_redis)],
    product_id: uuid.UUID | None = None,
) -> None:
    """Live price feed: messages published by the worker on Redis, relayed as-is.

    Public (prices aren't private) and read-only. Optional `?product_id=` filters
    to one product.
    """
    await websocket.accept()
    pubsub = client.pubsub()
    try:
        await pubsub.subscribe(PRICE_PUBSUB_CHANNEL)
    except Exception:  # noqa: BLE001 - Redis down: tell the client to fall back to polling
        logger.warning("price feed unavailable: cannot subscribe to redis")
        await websocket.close(code=1011, reason="price feed unavailable")
        return

    try:
        await relay_prices(websocket, pubsub, product_id)
    except WebSocketDisconnect:
        pass
    finally:
        try:
            await pubsub.unsubscribe(PRICE_PUBSUB_CHANNEL)
            await pubsub.aclose()
            await client.aclose()
        except Exception:  # noqa: BLE001 - best-effort cleanup
            pass
