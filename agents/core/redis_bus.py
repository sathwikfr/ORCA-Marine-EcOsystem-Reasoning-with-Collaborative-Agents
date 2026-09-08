"""
agents/core/redis_bus.py
Utility helpers for Redis Pub/Sub communication between agents.
"""

import asyncio
import json
import logging
from typing import Callable, Awaitable

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

# ── Channel names ──────────────────────────────────────────────────────
CHANNELS = {
    "weather":    "orca:weather_agent",
    "ocean":      "orca:ocean_agent",
    "satellite":  "orca:satellite_agent",
    "vessel":     "orca:vessel_agent",
    "ecosystem":  "orca:ecosystem_agent",
    "disaster":   "orca:disaster_reasoning_agent",
    "final":      "orca:final_alert",
}

ALL_DOMAIN_CHANNELS = [
    CHANNELS["weather"],
    CHANNELS["ocean"],
    CHANNELS["satellite"],
    CHANNELS["vessel"],
    CHANNELS["ecosystem"],
]


class RedisBusSubscriber:
    """
    Subscribes to one or more Redis channels and calls a handler
    for each message received.

    Usage:
        subscriber = RedisBusSubscriber(redis_url, [CHANNELS["weather"]])
        await subscriber.listen(handler_fn)
    """

    def __init__(self, redis_url: str, channels: list[str]):
        self.redis_url = redis_url
        self.channels = channels

    async def listen(
        self,
        handler: Callable[[str, dict], Awaitable[None]],
        timeout_s: float = 300.0,
    ) -> None:
        """
        Listen to subscribed channels. Calls handler(channel, message_dict).
        Stops after timeout_s seconds or when all messages are processed.
        """
        r = await aioredis.from_url(self.redis_url, decode_responses=True)
        pubsub = r.pubsub()
        await pubsub.subscribe(*self.channels)
        logger.info(f"Subscribed to: {self.channels}")

        deadline = asyncio.get_event_loop().time() + timeout_s
        async for message in pubsub.listen():
            if asyncio.get_event_loop().time() > deadline:
                break
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    await handler(message["channel"], data)
                except Exception as exc:
                    logger.error(f"Handler error on {message['channel']}: {exc}")

        await pubsub.unsubscribe()
        await r.aclose()
