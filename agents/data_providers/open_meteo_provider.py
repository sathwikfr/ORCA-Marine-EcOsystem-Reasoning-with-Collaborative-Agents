"""
agents/data_providers/open_meteo_provider.py
Adapter for the Open-Meteo free weather API.
Docs: https://open-meteo.com/en/docs
"""

import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

# Variables requested from Open-Meteo
HOURLY_VARIABLES = ",".join([
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "surface_pressure",
    "wind_speed_10m",
    "wind_direction_10m",
    "visibility",
])

DAILY_VARIABLES = ",".join([
    "temperature_2m_max",
    "precipitation_sum",
    "wind_speed_10m_max",
])


class OpenMeteoProvider:
    """
    Fetches current + forecast weather from the Open-Meteo public API.
    No API key required for the free tier.
    """

    BASE_URL = "https://api.open-meteo.com/v1"

    def __init__(self, timeout_s: float = 30.0):
        self.timeout = timeout_s

    async def get_current_weather(
        self, lat: float, lon: float
    ) -> Optional[dict[str, Any]]:
        """
        Fetch latest hourly weather for a lat/lon point.
        Returns the most recent hour's values or None on failure.
        """
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": HOURLY_VARIABLES,
            "timezone": "Asia/Kolkata",
            "forecast_days": 1,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(f"{self.BASE_URL}/forecast", params=params)
                resp.raise_for_status()
                data = resp.json()
                return self._extract_latest(data, lat, lon)
        except Exception as exc:
            logger.error(f"OpenMeteo fetch failed for ({lat},{lon}): {exc}")
            return None

    async def get_forecast(
        self, lat: float, lon: float, days: int = 3
    ) -> Optional[list[dict]]:
        """Fetch N-day hourly forecast."""
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": HOURLY_VARIABLES,
            "timezone": "Asia/Kolkata",
            "forecast_days": days,
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(f"{self.BASE_URL}/forecast", params=params)
                resp.raise_for_status()
                data = resp.json()
                return self._parse_forecast(data)
        except Exception as exc:
            logger.error(f"OpenMeteo forecast failed for ({lat},{lon}): {exc}")
            return None

    def _extract_latest(
        self, data: dict, lat: float, lon: float
    ) -> dict[str, Any]:
        """Extract the most recent hour from the hourly array."""
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        if not times:
            return {}
        # Use last available time index
        idx = len(times) - 1
        return {
            "lat": lat,
            "lon": lon,
            "timestamp": times[idx],
            "temperature_c": self._safe(hourly, "temperature_2m", idx),
            "humidity_pct": self._safe(hourly, "relative_humidity_2m", idx),
            "rainfall_mm": self._safe(hourly, "precipitation", idx),
            "pressure_hpa": self._safe(hourly, "surface_pressure", idx),
            "wind_speed_kmph": self._safe(hourly, "wind_speed_10m", idx),
            "wind_direction": self._safe(hourly, "wind_direction_10m", idx),
            "visibility_km": self._safe(hourly, "visibility", idx, scale=0.001),
            "source": "open_meteo",
        }

    def _parse_forecast(self, data: dict) -> list[dict]:
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        return [
            {
                "timestamp": times[i],
                "temperature_c": self._safe(hourly, "temperature_2m", i),
                "pressure_hpa": self._safe(hourly, "surface_pressure", i),
                "wind_speed_kmph": self._safe(hourly, "wind_speed_10m", i),
                "wind_direction": self._safe(hourly, "wind_direction_10m", i),
                "rainfall_mm": self._safe(hourly, "precipitation", i),
            }
            for i in range(len(times))
        ]

    @staticmethod
    def _safe(
        data: dict, key: str, idx: int, scale: float = 1.0
    ) -> Optional[float]:
        val = data.get(key, [None])[idx]
        if val is None:
            return None
        return round(val * scale, 3)
