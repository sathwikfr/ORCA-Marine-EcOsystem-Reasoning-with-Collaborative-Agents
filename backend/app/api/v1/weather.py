"""
backend/app/api/v1/weather.py
Weather data proxy endpoints — serves cached agent data.
"""

import json
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
import redis.asyncio as aioredis

from ...core.config import settings

router = APIRouter(prefix="/weather", tags=["Weather"])


async def get_redis():
    r = await aioredis.from_url(settings.redis_url, decode_responses=True)
    try:
        yield r
    finally:
        await r.aclose()


@router.get("/current")
async def get_current_weather(
    r: Annotated[aioredis.Redis, Depends(get_redis)],
    region: Optional[str] = Query(None, description="Coastal zone name"),
):
    """Return latest weather data from agent cache."""
    raw = await r.get("orca:weather_agent:latest")
    if not raw:
        return {"status": "no_data", "message": "Weather agent has not run yet"}
    data = json.loads(raw)
    if region:
        zones = data.get("observations", {}).get("all_zones", [])
        zone = next((z for z in zones if z["zone"] == region), None)
        return zone or {"error": f"Zone '{region}' not found"}
    return data


@router.get("/agents/status")
async def get_agent_status(r: Annotated[aioredis.Redis, Depends(get_redis)]):
    """Return status of all ORCA agents from cache."""
    agent_ids = [
        "weather_agent", "ocean_agent", "satellite_agent",
        "vessel_agent", "ecosystem_agent",
        "disaster_reasoning_agent", "coordinator_agent",
    ]
    statuses = []
    for agent_id in agent_ids:
        raw = await r.get(f"agent:status:{agent_id}")
        if raw:
            statuses.append(json.loads(raw))
        else:
            statuses.append({
                "agent_id": agent_id,
                "status": "UNKNOWN",
                "last_run": None,
            })
    return {"agents": statuses}
