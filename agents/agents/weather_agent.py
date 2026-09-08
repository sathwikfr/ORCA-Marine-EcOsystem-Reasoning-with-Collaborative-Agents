"""
agents/agents/weather_agent.py
WeatherAgent: Monitors atmospheric conditions over Indian coastal zones.
Data source (prototype): Open-Meteo free API.
"""

import asyncio
import logging
from typing import Any

from ..core.base_agent import BaseAgent
from ..core.redis_bus import CHANNELS
from ..data_providers.open_meteo_provider import OpenMeteoProvider

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../"))
from shared.orca_event import OrcaEvent, OrcaAnomaly, BoundingBox
from shared.regions import INDIAN_COASTAL_ZONES, CoastalZone

logger = logging.getLogger(__name__)


class WeatherAgent(BaseAgent):
    """
    Fetches weather data for all Indian coastal zones, detects anomalies
    (rapid pressure drops, extreme wind), calculates a composite risk score,
    and publishes an OrcaEvent to the Redis weather channel.
    """

    BEAUFORT_CATEGORIES = [
        (0, 1, "Calm"), (1, 6, "Light Air"), (6, 12, "Light Breeze"),
        (12, 20, "Gentle Breeze"), (20, 29, "Moderate Breeze"),
        (29, 39, "Fresh Breeze"), (39, 50, "Strong Breeze"),
        (50, 62, "Near Gale"), (62, 75, "Gale"),
        (75, 89, "Strong Gale"), (89, 103, "Storm"),
        (103, 118, "Violent Storm"), (118, 9999, "Hurricane Force"),
    ]

    def __init__(self, redis_url: str):
        super().__init__(
            agent_id="weather_agent",
            display_name="Weather Agent",
            redis_url=redis_url,
        )
        self.provider = OpenMeteoProvider()

    # ── Abstract method implementations ──────────────────────────────────

    async def fetch_data(self) -> list[dict]:
        """Fetch weather for all coastal zones in parallel."""
        tasks = [
            self.provider.get_current_weather(zone.center_lat, zone.center_lon)
            for zone in INDIAN_COASTAL_ZONES
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        valid = []
        for zone, result in zip(INDIAN_COASTAL_ZONES, results):
            if isinstance(result, Exception) or result is None:
                logger.warning(f"Weather fetch failed for zone {zone.name}")
                continue
            result["zone_name"] = zone.name
            valid.append(result)
        return valid

    def process_data(self, raw: list[dict]) -> dict[str, Any]:
        """
        Aggregate weather readings across all zones.
        Returns the zone with the highest risk as the primary observation,
        plus summaries for all zones.
        """
        if not raw:
            return {}

        zone_summaries = []
        for reading in raw:
            wind = reading.get("wind_speed_kmph") or 0.0
            pressure = reading.get("pressure_hpa") or 1013.0
            zone_summaries.append({
                "zone": reading.get("zone_name"),
                "wind_speed_kmph": wind,
                "pressure_hpa": pressure,
                "temperature_c": reading.get("temperature_c"),
                "humidity_pct": reading.get("humidity_pct"),
                "rainfall_mm": reading.get("rainfall_mm"),
                "beaufort": self.classify_storm_intensity(wind),
                "pressure_anomaly": pressure < 1000,  # Below 1000 hPa = concern
            })

        # Pick highest-risk zone
        zone_summaries.sort(key=lambda z: (-z["wind_speed_kmph"], z["pressure_hpa"]))
        primary = zone_summaries[0]

        return {
            "primary_zone": primary,
            "all_zones": zone_summaries,
            "max_wind_kmph": max(z["wind_speed_kmph"] for z in zone_summaries),
            "min_pressure_hpa": min(z["pressure_hpa"] for z in zone_summaries),
        }

    def calculate_risk_score(self, observations: dict[str, Any]) -> float:
        """
        Composite risk score (0–1):
        - Wind speed component: 40%
        - Pressure component: 40%
        - Rainfall component: 20%
        """
        if not observations:
            return 0.0

        max_wind = observations.get("max_wind_kmph", 0.0)
        min_pressure = observations.get("min_pressure_hpa", 1013.0)

        # Wind: 0 → 0.0, 120+ → 1.0
        wind_score = min(max_wind / 120.0, 1.0)
        # Pressure: 1013 → 0.0, 950 → 1.0
        pressure_score = max(0.0, (1013.0 - min_pressure) / 63.0)
        pressure_score = min(pressure_score, 1.0)

        return round(0.4 * wind_score + 0.4 * pressure_score + 0.2 * 0.0, 3)

    # ── Main run ──────────────────────────────────────────────────────────

    async def run(self) -> OrcaEvent:
        raw = await self.fetch_data()
        if not raw:
            return OrcaEvent.error_event(self.agent_id, "No weather data available")

        observations = self.process_data(raw)
        risk_score = self.calculate_risk_score(observations)
        anomalies = self._detect_anomalies(observations)

        event = OrcaEvent(
            agent_id=self.agent_id,
            observations=observations,
            anomalies=anomalies,
            risk_score=risk_score,
            confidence=0.90,
            data_source="open_meteo",
            quality_flag="GOOD" if observations else "BAD",
        )

        await self.publish(event, channel=CHANNELS["weather"])
        return event

    # ── Helpers ───────────────────────────────────────────────────────────

    def classify_storm_intensity(self, wind_kmph: float) -> str:
        for low, high, label in self.BEAUFORT_CATEGORIES:
            if low <= wind_kmph < high:
                return label
        return "Unknown"

    def _detect_anomalies(self, observations: dict) -> list[OrcaAnomaly]:
        anomalies: list[OrcaAnomaly] = []

        max_wind = observations.get("max_wind_kmph", 0.0)
        min_pressure = observations.get("min_pressure_hpa", 1013.0)

        if max_wind >= 89:
            anomalies.append(OrcaAnomaly(
                anomaly_type="EXTREME_WIND",
                severity="CRITICAL" if max_wind >= 118 else "HIGH",
                confidence=0.95,
                description=f"Wind speed {max_wind:.0f} km/h — {self.classify_storm_intensity(max_wind)}",
            ))

        if min_pressure < 980:
            anomalies.append(OrcaAnomaly(
                anomaly_type="VERY_LOW_PRESSURE",
                severity="HIGH" if min_pressure < 970 else "MEDIUM",
                confidence=0.90,
                description=f"Minimum pressure {min_pressure:.1f} hPa — deep depression / cyclone precursor",
            ))

        return anomalies
