"""
agents/agents/satellite_agent.py
SatelliteAgent: Ingests and processes Copernicus Sentinel-1 SAR & Sentinel-2 MSI optical imagery.
Detects:
  1. Oil slick signatures (Sentinel-1 C-band SAR backscatter damping)
  2. Harmful algal blooms / Chlorophyll-a anomalies (Sentinel-2 NDCI band ratios)
  3. Coastal sediment & turbidity plumes
"""

import asyncio
import logging
from typing import Any
from datetime import datetime, timezone

from ..core.base_agent import BaseAgent
from ..core.redis_bus import CHANNELS

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../"))
from shared.orca_event import OrcaEvent, OrcaAnomaly, BoundingBox
from shared.regions import INDIAN_COASTAL_ZONES, CoastalZone

logger = logging.getLogger(__name__)


class SatelliteAgent(BaseAgent):
    """
    Simulates operational integration with Copernicus Data Space Ecosystem (CDSE)
    and Sentinel Hub API. Analyzes Sentinel-1 SAR radar backscatter and Sentinel-2
    multi-spectral optical indices for Indian coastal waters.
    """

    def __init__(self, redis_url: str):
        super().__init__(
            agent_id="satellite_agent",
            display_name="Sentinel Satellite Agent",
            redis_url=redis_url,
        )

    # ── Data Fetching ─────────────────────────────────────────────────────────

    async def fetch_data(self) -> list[dict]:
        """
        Simulates fetching satellite scene metadata and pre-computed index statistics
        from Copernicus Open Access / CDSE OData services for Indian coastal zones.
        """
        # Realistic observational catalog for Indian EEZ scenes
        scenes = [
            {
                "satellite": "Sentinel-2B",
                "instrument": "MSI",
                "zone_name": "Arabian Sea South",
                "center_lat": 9.8,
                "center_lon": 75.8,
                "cloud_cover_pct": 4.2,
                "ndci_chlorophyll": 0.42,  # Normal is < 0.10, > 0.35 indicates algal bloom
                "bloom_detected": True,
                "bloom_area_km2": 340.0,
                "acquisition_time": datetime.now(timezone.utc).isoformat(),
            },
            {
                "satellite": "Sentinel-1A",
                "instrument": "C-SAR",
                "zone_name": "Arabian Sea North",
                "center_lat": 21.4,
                "center_lon": 69.2,
                "sar_mode": "IW_GRDH_1SDV",
                "backscatter_damping_db": -5.2,  # > -3 dB is nominal, -5.2 dB is oil slick damping
                "oil_anomaly_detected": True,
                "slick_length_km": 18.4,
                "acquisition_time": datetime.now(timezone.utc).isoformat(),
            },
            {
                "satellite": "Sentinel-2A",
                "instrument": "MSI",
                "zone_name": "Bay of Bengal Central",
                "center_lat": 16.0,
                "center_lon": 82.0,
                "cloud_cover_pct": 78.5,  # Heavy cyclonic convective cloud shield
                "deep_convection_flag": True,
                "acquisition_time": datetime.now(timezone.utc).isoformat(),
            },
        ]
        await asyncio.sleep(0.05)  # Yield to event loop
        return scenes

    # ── Processing & Feature Extraction ───────────────────────────────────────

    def process_data(self, raw: list[dict]) -> dict[str, Any]:
        """Synthesize scene detections across optical and radar platforms."""
        if not raw:
            return {}

        blooms = [s for s in raw if s.get("bloom_detected")]
        oil_slicks = [s for s in raw if s.get("oil_anomaly_detected")]
        convective = [s for s in raw if s.get("deep_convection_flag")]

        return {
            "total_scenes_processed": len(raw),
            "harmful_algal_blooms": blooms,
            "oil_slick_anomalies": oil_slicks,
            "convective_storm_clouds": convective,
            "max_bloom_area_km2": max((s.get("bloom_area_km2", 0) for s in blooms), default=0.0),
            "max_slick_length_km": max((s.get("slick_length_km", 0) for s in oil_slicks), default=0.0),
        }

    # ── Risk Scoring ──────────────────────────────────────────────────────────

    def calculate_risk_score(self, observations: dict[str, Any]) -> float:
        """
        Risk score (0 to 1) based on satellite disaster footprints:
        - Oil slick: 0.65+
        - Severe algal bloom: 0.50+
        - Severe convective cloud cover: 0.40+
        """
        if not observations:
            return 0.0

        score = 0.0
        if observations.get("oil_slick_anomalies"):
            score = max(score, 0.70)
        if observations.get("harmful_algal_blooms"):
            score = max(score, 0.55)
        if observations.get("convective_storm_clouds"):
            score = max(score, 0.45)

        return round(score, 3)

    def _detect_anomalies(self, observations: dict[str, Any]) -> list[OrcaAnomaly]:
        anomalies = []

        for slick in observations.get("oil_slick_anomalies", []):
            anomalies.append(OrcaAnomaly(
                metric_name="sar_backscatter_damping",
                observed_value=slick.get("backscatter_damping_db", 0),
                baseline_value=-2.0,
                z_score=-3.8,
                description=f"Sentinel-1 SAR detected {slick.get('slick_length_km')}km capillary damping slick signature in {slick.get('zone_name')}",
                severity="HIGH",
            ))

        for bloom in observations.get("harmful_algal_blooms", []):
            anomalies.append(OrcaAnomaly(
                metric_name="ndci_chlorophyll_index",
                observed_value=bloom.get("ndci_chlorophyll", 0),
                baseline_value=0.08,
                z_score=4.2,
                description=f"Sentinel-2 MSI flagged {bloom.get('bloom_area_km2')}km² chlorophyll-a algal bloom in {bloom.get('zone_name')}",
                severity="MEDIUM",
            ))

        return anomalies

    # ── Main Run Cycle ────────────────────────────────────────────────────────

    async def run(self) -> OrcaEvent:
        raw = await self.fetch_data()
        if not raw:
            return OrcaEvent.error_event(self.agent_id, "No satellite data returned")

        observations = self.process_data(raw)
        risk_score = self.calculate_risk_score(observations)
        anomalies = self._detect_anomalies(observations)

        event = OrcaEvent(
            agent_id=self.agent_id,
            observations=observations,
            anomalies=anomalies,
            risk_score=risk_score,
            confidence=0.88,
            data_source="copernicus_sentinel",
            quality_flag="GOOD" if observations else "BAD",
        )

        await self.publish(CHANNELS.get("SATELLITE", "orca:satellite"), event)
        return event
