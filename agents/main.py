"""
agents/main.py
Entry point for the Agents service.
Can be run as a one-shot cycle or a continuous loop.
"""

import asyncio
import logging
import sys
import os

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("orca.agents")

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../"))

from agents.core.config import config
from agents.agents.coordinator_agent import CoordinatorAgent


async def run_once():
    """Run a single ORCA agent cycle."""
    logger.info("ORCA Agents service starting...")
    coordinator = CoordinatorAgent(
        redis_url=config.redis_url,
        backend_url=os.getenv("BACKEND_URL", "http://backend:8000"),
    )
    event = await coordinator.orchestrate()
    logger.info(f"Cycle complete | risk_score={event.risk_score:.3f}")
    return event


async def run_loop():
    """Run the ORCA agent cycle on a schedule (for standalone deployment)."""
    import signal

    coordinator = CoordinatorAgent(
        redis_url=config.redis_url,
        backend_url=os.getenv("BACKEND_URL", "http://backend:8000"),
    )

    shutdown = asyncio.Event()

    def _handle_signal(*_):
        logger.info("Shutdown signal received")
        shutdown.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            asyncio.get_event_loop().add_signal_handler(sig, _handle_signal)
        except NotImplementedError:
            pass  # Windows doesn't support add_signal_handler

    interval = config.agent_cycle_interval_minutes * 60
    logger.info(f"Starting agent loop — interval={interval}s")

    while not shutdown.is_set():
        try:
            await coordinator.orchestrate()
        except Exception as exc:
            logger.error(f"Agent cycle error: {exc}", exc_info=True)

        logger.info(f"Sleeping {interval}s until next cycle...")
        try:
            await asyncio.wait_for(shutdown.wait(), timeout=interval)
        except asyncio.TimeoutError:
            pass  # Normal — continue loop

    logger.info("ORCA Agents service stopped.")


if __name__ == "__main__":
    mode = os.getenv("AGENT_MODE", "loop")
    if mode == "once":
        asyncio.run(run_once())
    else:
        asyncio.run(run_loop())
