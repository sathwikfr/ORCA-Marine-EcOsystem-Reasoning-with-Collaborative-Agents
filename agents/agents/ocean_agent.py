"""
agents/agents/ocean_agent.py
OceanAgent: Monitors SST, wave heights, and ocean currents.
Prototype data source: Open-Meteo Marine API (free, no key required).
"""

import asyncio
import logging
from typing import Any, Optional

import httpx

from ..core.base_agent import BaseAgent
from ..core.redis_bus import CHANNELS

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../"))
from shared.orca_event import OrcaEvent, OrcaAnomaly
from shared.regions import INDIAN_COASTAL_ZONES

logger = logging.getLogger(__name__)

# Open-Meteo Marine API variables
MARINE_VARIABLES = ",".join([
    "wave_height",
    "wave_direction",
    "wave_period",
    "wind_wave_height",
    "swell_wave_height",
])

# Monthly SST climatology baselines for Indian Ocean (approximate)
SST_BASELINE_BY_MONTH = {
    1: 27.5, 2: 27.8, 3: 28.4, 4: 29.0,
    5: 30.2, 6: 29.5, 7: 28.8, 8: 28.6,
    9: 28.9, 10: 29.1, 11: 28.5, 12: 28.0,
}


class OceanAgent(BaseAgent):
    """
    Fetches ocean and marine weather data.
    Detects: high waves, SST anomalies (via NOAA ERDDAP as backup).
    """

    WAVE_HEIGHT_DANGER_M = 3.5   # Dangerous for small fishing vessels
    SST_BLEACHING_THRESHOLD = 30.0  # Coral bleaching starts ~30°C

    def __init__(self, redis_url: str):
        super().__init__(
            agent_id="ocean_agent",
            display_name="Ocean Agent",
            redis_url=redis_url,
        )

    async def fetch_data(self) -> list[dict]:
        """Fetch marine conditions for all coastal zones (Open-Meteo Marine)."""
        tasks = [
            self._fetch_marine_zone(zone.center_lat, zone.center_lon, zone.name)
            for zone in INDIAN_COASTAL_ZONES
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [r for r in results if isinstance(r, dict)]

    async def _fetch_marine_zone(
        self, lat: float, lon: float, zone_name: str
    ) -> Optional[dict]:
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": MARINE_VARIABLES,
            "timezone": "Asia/Kolkata",
            "forecast_days": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    "https://marine-api.open-meteo.com/v1/marine", params=params
                )
                resp.raise_for_status()
                data = resp.json()
                hourly = data.get("hourly", {})
                times = hourly.get("time", [])
                if not times:
                    return None
                idx = len(times) - 1
                return {
                    "zone_name": zone_name,
                    "lat": lat,
                    "lon": lon,
                    "timestamp": times[idx],
                    "wave_height_m": hourly.get("wave_height", [None])[idx],
                    "wave_direction": hourly.get("wave_direction", [None])[idx],
                    "wave_period_s": hourly.get("wave_period", [None])[idx],
                    "swell_height_m": hourly.get("swell_wave_height", [None])[idx],
                    # SST from climatology (ERDDAP integration in production)
                    "sst_celsius": self._estimate_sst(lat),
                    "source": "open_meteo_marine",
                }
        except Exception as exc:
            logger.warning(f"Marine fetch failed for {zone_name}: {exc}")
            return None

    def _estimate_sst(self, lat: float) -> float:
        """
        Estimate SST from latitude and month (production will use ERDDAP/Copernicus).
        Simple model: warmer near equator, use monthly climatology.
        """
        from datetime import datetime
        month = datetime.utcnow().month
        base = SST_BASELINE_BY_MONTH.get(month, 28.5)
        # Slight cooling effect at higher latitudes
        lat_correction = max(0.0, (lat - 8.0) * 0.1)
        return round(base - lat_correction, 2)

    def process_data(self, raw: list[dict]) -> dict[str, Any]:
        if not raw:
            return {}

        zone_summaries = []
        for reading in raw:
            wave_h = reading.get("wave_height_m") or 0.0
            sst = reading.get("sst_celsius") or 28.5
            from datetime import datetime
            month = datetime.utcnow().month
            sst_baseline = SST_BASELINE_BY_MONTH.get(month, 28.5)
            zone_summaries.append({
                "zone": reading["zone_name"],
                "wave_height_m": wave_h,
                "wave_period_s": reading.get("wave_period_s"),
                "swell_height_m": reading.get("swell_height_m"),
                "sst_celsius": sst,
                "sst_anomaly_c": round(sst - sst_baseline, 2),
                "dangerous_waves": wave_h >= self.WAVE_HEIGHT_DANGER_M,
                "bleaching_risk": sst >= self.SST_BLEACHING_THRESHOLD,
            })

        zone_summaries.sort(key=lambda z: -z["wave_height_m"])
        return {
            "primary_zone": zone_summaries[0] if zone_summaries else {},
            "all_zones": zone_summaries,
            "max_wave_height_m": max(z["wave_height_m"] for z in zone_summaries),
            "max_sst_celsius": max(z["sst_celsius"] for z in zone_summaries),
            "max_sst_anomaly_c": max(z["sst_anomaly_c"] for z in zone_summaries),
            "zones_with_dangerous_waves": sum(
                1 for z in zone_summaries if z["dangerous_waves"]
            ),
        }

    def calculate_risk_score(self, observations: dict[str, Any]) -> float:
        if not observations:
            return 0.0
        wave_score = min(observations.get("max_wave_height_m", 0.0) / 8.0, 1.0)
        sst_anomaly = observations.get("max_sst_anomaly_c", 0.0)
        sst_score = min(max(sst_anomaly, 0.0) / 3.0, 1.0)
        return round(0.6 * wave_score + 0.4 * sst_score, 3)

    def _detect_anomalies(self, observations: dict) -> list[OrcaAnomaly]:
        anomalies: list[OrcaAnomaly] = []
        max_wave = observations.get("max_wave_height_m", 0.0)
        sst_anomaly = observations.get("max_sst_anomaly_c", 0.0)

        if max_wave >= self.WAVE_HEIGHT_DANGER_M:
            anomalies.append(OrcaAnomaly(
                anomaly_type="DANGEROUS_WAVE_HEIGHT",
                severity="HIGH" if max_wave >= 5.0 else "MEDIUM",
                confidence=0.85,
                description=f"Wave height {max_wave:.1f}m — dangerous for small vessels",
            ))

        if sst_anomaly >= 1.5:
            anomalies.append(OrcaAnomaly(
                anomaly_type="SST_ANOMALY",
                severity="HIGH" if sst_anomaly >= 2.5 else "MEDIUM",
                confidence=0.75,
                description=f"SST is +{sst_anomaly:.1f}°C above climatology — cyclone intensification risk",
            ))

        return anomalies

    async def run(self) -> OrcaEvent:
        raw = await self.fetch_data()
        if not raw:
            return OrcaEvent.error_event(self.agent_id, "No ocean data available")

        observations = self.process_data(raw)
        risk_score = self.calculate_risk_score(observations)
        anomalies = self._detect_anomalies(observations)

        event = OrcaEvent(
            agent_id=self.agent_id,
            observations=observations,
            anomalies=anomalies,
            risk_score=risk_score,
            confidence=0.80,
            data_source="open_meteo_marine",
            quality_flag="GOOD",
        )

        await self.publish(event, channel=CHANNELS["ocean"])
        return event
