"""
agents/agents/vessel_agent.py
VesselAgent: Tracks marine vessel positions via AIS and detects vessels in risk zones.
Prototype: Uses AISHub public demo data or mock data if credentials unavailable.
"""

import asyncio
import logging
import random
import math
from typing import Any, Optional

import httpx

from ..core.base_agent import BaseAgent
from ..core.redis_bus import CHANNELS

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../"))
from shared.orca_event import OrcaEvent, OrcaAnomaly, GeoPoint
from shared.regions import INDIAN_COASTAL_ZONES

logger = logging.getLogger(__name__)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two lat/lon points in km."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class VesselAgent(BaseAgent):
    """
    Fetches AIS vessel positions and checks which vessels are inside active risk zones.
    In prototype mode (no AIS credentials), generates realistic mock vessel data
    across Indian coastal zones.
    """

    def __init__(self, redis_url: str, aishub_username: str = ""):
        super().__init__(
            agent_id="vessel_agent",
            display_name="Vessel Agent",
            redis_url=redis_url,
        )
        self.aishub_username = aishub_username
        self._risk_zones: list[dict] = []   # Populated from Redis by coordinator

    async def fetch_data(self) -> list[dict]:
        """
        Attempt real AIS fetch; fall back to mock data for prototype.
        """
        if self.aishub_username:
            vessels = await self._fetch_ais_hub()
            if vessels:
                return vessels
        return self._generate_mock_vessels()

    async def _fetch_ais_hub(self) -> list[dict]:
        """Fetch from AISHub API (requires free registration)."""
        url = "https://data.aishub.net/ws.php"
        params = {
            "username": self.aishub_username,
            "format": 1,      # JSON
            "output": "full",
            "compress": 0,
        }
        try:
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
                return self._parse_ais_response(data)
        except Exception as exc:
            logger.warning(f"AISHub fetch failed: {exc}. Using mock data.")
            return []

    def _parse_ais_response(self, data: list) -> list[dict]:
        vessels = []
        for entry in data:
            vessels.append({
                "mmsi": str(entry.get("MMSI", "")),
                "vessel_name": entry.get("NAME", "Unknown"),
                "vessel_type": entry.get("TYPE", "UNKNOWN"),
                "lat": entry.get("LATITUDE"),
                "lon": entry.get("LONGITUDE"),
                "speed_knots": entry.get("SPEED", 0.0),
                "course": entry.get("COURSE", 0),
                "nav_status": entry.get("NAVSTAT", ""),
                "source": "aishub",
            })
        return vessels

    def _generate_mock_vessels(self) -> list[dict]:
        """Generate realistic mock vessels for Indian coastal zones."""
        random.seed(42)  # Deterministic for demo
        vessels = []
        vessel_types = ["FISHING"] * 7 + ["CARGO", "TANKER", "PASSENGER"]
        for i in range(60):
            zone = random.choice(INDIAN_COASTAL_ZONES)
            lat = random.uniform(zone.lat_min, zone.lat_max)
            lon = random.uniform(zone.lon_min, zone.lon_max)
            vtype = random.choice(vessel_types)
            vessels.append({
                "mmsi": f"41900{i:04d}",
                "vessel_name": f"MV-{i:03d}",
                "vessel_type": vtype,
                "lat": round(lat, 4),
                "lon": round(lon, 4),
                "speed_knots": round(random.uniform(0, 12), 1),
                "course": random.randint(0, 359),
                "nav_status": "Under way using engine",
                "source": "mock",
                "zone": zone.name,
            })
        return vessels

    def process_data(self, raw: list[dict]) -> dict[str, Any]:
        if not raw:
            return {"total_vessels": 0, "vessels": []}

        # Check each vessel against risk zones (simplified: circle check)
        vessels_in_risk = []
        for v in raw:
            if v.get("lat") and v.get("lon"):
                in_zone, zone_id = self._check_risk_zones(v["lat"], v["lon"])
                if in_zone:
                    v["in_risk_zone"] = True
                    v["risk_zone_id"] = zone_id
                    vessels_in_risk.append(v)
                else:
                    v["in_risk_zone"] = False

        return {
            "total_vessels": len(raw),
            "vessels_in_risk_zone": len(vessels_in_risk),
            "vessels": raw[:50],  # Cap payload size
            "risk_vessels": vessels_in_risk,
            "fishing_boats_in_risk": sum(
                1 for v in vessels_in_risk if v.get("vessel_type") == "FISHING"
            ),
        }

    def _check_risk_zones(self, lat: float, lon: float) -> tuple[bool, Optional[str]]:
        """Check if a position falls within any active risk zone."""
        for zone in self._risk_zones:
            center_lat = zone.get("center_lat")
            center_lon = zone.get("center_lon")
            radius_km = zone.get("radius_km", 200)
            zone_id = zone.get("id")
            if center_lat and center_lon:
                dist = _haversine_km(lat, lon, center_lat, center_lon)
                if dist <= radius_km:
                    return True, zone_id
        return False, None

    def calculate_risk_score(self, observations: dict[str, Any]) -> float:
        total = observations.get("total_vessels", 0)
        in_risk = observations.get("vessels_in_risk_zone", 0)
        if total == 0:
            return 0.0
        ratio = in_risk / total
        # Also weight by fishing boats (more vulnerable)
        fishing_in_risk = observations.get("fishing_boats_in_risk", 0)
        fishing_score = min(fishing_in_risk / 10.0, 1.0)
        return round(0.5 * ratio + 0.5 * fishing_score, 3)

    async def run(self) -> OrcaEvent:
        # Load current risk zones from Redis cache
        cached = await self.cache_get("alerts:active:zones")
        if cached:
            import json
            self._risk_zones = json.loads(cached)

        raw = await self.fetch_data()
        observations = self.process_data(raw)
        risk_score = self.calculate_risk_score(observations)
        anomalies = self._detect_anomalies(observations)

        event = OrcaEvent(
            agent_id=self.agent_id,
            observations=observations,
            anomalies=anomalies,
            risk_score=risk_score,
            confidence=0.75,
            data_source="aishub" if self.aishub_username else "mock",
            quality_flag="GOOD" if self.aishub_username else "SUSPECT",
        )

        await self.publish(event, channel=CHANNELS["vessel"])
        return event

    def _detect_anomalies(self, observations: dict) -> list[OrcaAnomaly]:
        anomalies = []
        fishing_at_risk = observations.get("fishing_boats_in_risk", 0)
        if fishing_at_risk >= 5:
            anomalies.append(OrcaAnomaly(
                anomaly_type="FISHING_VESSELS_IN_DANGER",
                severity="HIGH" if fishing_at_risk >= 10 else "MEDIUM",
                confidence=0.80,
                description=f"{fishing_at_risk} fishing boats detected inside active risk zone",
            ))
        return anomalies
