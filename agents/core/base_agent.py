"""
agents/core/base_agent.py
Abstract base class that every ORCA agent extends.
Provides: lifecycle management, Redis publishing, error handling, logging.
"""

import asyncio
import logging
import time
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, Optional

import redis.asyncio as aioredis

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../"))

from shared.orca_event import OrcaEvent
from shared.severity import AgentStatus

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """
    Every ORCA agent inherits from this class.
    Subclasses must implement: run(), fetch_data(), process_data(), calculate_risk_score()
    """

    def __init__(
        self,
        agent_id: str,
        display_name: str,
        redis_url: str = "redis://localhost:6379/0",
    ):
        self.agent_id = agent_id
        self.display_name = display_name
        self.redis_url = redis_url
        self._redis: Optional[aioredis.Redis] = None

        self.status: AgentStatus = AgentStatus.IDLE
        self.last_run: Optional[datetime] = None
        self.last_run_duration_s: float = 0.0
        self.last_run_status: str = "NEVER_RUN"
        self.error_count: int = 0

        self.logger = logging.getLogger(f"orca.{agent_id}")

    # ── Redis ────────────────────────────────────────────────────────────

    async def _get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = await aioredis.from_url(self.redis_url, decode_responses=True)
        return self._redis

    async def publish(self, event: OrcaEvent, channel: Optional[str] = None) -> None:
        """Publish an OrcaEvent to the Redis message bus."""
        ch = channel or f"orca:{self.agent_id}"
        r = await self._get_redis()
        await r.publish(ch, event.to_json())
        self.logger.debug(f"Published to {ch}: risk_score={event.risk_score:.2f}")

    async def cache_set(self, key: str, value: str, ttl_seconds: int) -> None:
        r = await self._get_redis()
        await r.setex(key, ttl_seconds, value)

    async def cache_get(self, key: str) -> Optional[str]:
        r = await self._get_redis()
        return await r.get(key)

    # ── Lifecycle ────────────────────────────────────────────────────────

    async def execute(self) -> OrcaEvent:
        """
        Public entry point. Wraps run() with timing, status tracking, error handling.
        Always returns an OrcaEvent (error event if run() fails).
        """
        self.status = AgentStatus.RUNNING
        start = time.monotonic()
        self.logger.info(f"[{self.display_name}] Starting run")

        try:
            event = await self.run()
            self.last_run_status = "SUCCESS"
            self.status = AgentStatus.SUCCESS
            return event

        except Exception as exc:
            self.error_count += 1
            self.last_run_status = "ERROR"
            self.status = AgentStatus.ERROR
            self.logger.error(f"[{self.display_name}] Run failed: {exc}", exc_info=True)
            return OrcaEvent.error_event(self.agent_id, str(exc))

        finally:
            self.last_run = datetime.now(timezone.utc)
            self.last_run_duration_s = time.monotonic() - start
            self.logger.info(
                f"[{self.display_name}] Completed in {self.last_run_duration_s:.1f}s "
                f"| status={self.last_run_status}"
            )

    def get_status_dict(self) -> dict[str, Any]:
        """Return agent health status for the /agents/status API endpoint."""
        return {
            "agent_id": self.agent_id,
            "display_name": self.display_name,
            "status": self.status.value,
            "last_run": self.last_run.isoformat() if self.last_run else None,
            "last_run_duration_s": round(self.last_run_duration_s, 2),
            "last_run_status": self.last_run_status,
            "error_count": self.error_count,
        }

    async def health_check(self) -> bool:
        """Returns True if the agent can reach its primary data source."""
        try:
            raw = await self.fetch_data()
            return raw is not None
        except Exception:
            return False

    # ── Abstract methods ─────────────────────────────────────────────────

    @abstractmethod
    async def run(self) -> OrcaEvent:
        """Main agent logic. Fetch → Process → Score → Return event."""
        ...

    @abstractmethod
    async def fetch_data(self) -> Any:
        """Fetch raw data from the external data source."""
        ...

    @abstractmethod
    def process_data(self, raw: Any) -> dict[str, Any]:
        """Normalize raw data into structured observations dict."""
        ...

    @abstractmethod
    def calculate_risk_score(self, observations: dict[str, Any]) -> float:
        """Return a 0.0–1.0 risk score from normalized observations."""
        ...
