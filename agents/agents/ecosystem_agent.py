"""
agents/agents/ecosystem_agent.py
EcosystemAgent: Monitors marine biodiversity and coral health.
Prototype: Uses GBIF occurrence API + SST from OceanAgent output.
"""

import logging
from typing import Any, Optional

import httpx

from ..core.base_agent import BaseAgent
from ..core.redis_bus import CHANNELS

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../"))
from shared.orca_event import OrcaEvent, OrcaAnomaly

logger = logging.getLogger(__name__)

# Coral bleaching thresholds (NOAA Coral Reef Watch)
BLEACHING_ALERT_1_DHWK = 4   # Degree Heating Weeks
BLEACHING_ALERT_2_DHWK = 8

# GBIF taxon keys for key Indian Ocean species
GBIF_TAXA = {
    "coral": 798,          # Class Anthozoa
    "sea_turtle": 627877,  # Cheloniidae family
    "whale": 2440447,      # Order Cetacea
}


class EcosystemAgent(BaseAgent):
    """
    Monitors marine ecosystem health.
    Key signals:
    - Coral bleaching risk from SST (Degree Heating Weeks model)
    - Marine species sightings from GBIF
    - Protected area violation flags from VesselAgent
    """

    def __init__(self, redis_url: str):
        super().__init__(
            agent_id="ecosystem_agent",
            display_name="Ecosystem Agent",
            redis_url=redis_url,
        )
        self._latest_sst: float = 28.5  # Updated from OceanAgent output

    async def fetch_data(self) -> dict[str, Any]:
        """Fetch biodiversity data from GBIF for Indian Ocean region."""
        sightings = await self._fetch_gbif_occurrences()
        return {
            "sightings": sightings,
            "sst_celsius": self._latest_sst,
        }

    async def _fetch_gbif_occurrences(self) -> list[dict]:
        """Fetch recent marine species occurrences from GBIF."""
        all_sightings = []
        for species_name, taxon_key in GBIF_TAXA.items():
            try:
                async with httpx.AsyncClient(timeout=20) as client:
                    resp = await client.get(
                        "https://api.gbif.org/v1/occurrence/search",
                        params={
                            "taxonKey": taxon_key,
                            "decimalLatitude": "6,24",
                            "decimalLongitude": "60,100",
                            "limit": 20,
                            "hasCoordinate": True,
                        },
                    )
                    resp.raise_for_status()
                    results = resp.json().get("results", [])
                    for r in results[:5]:
                        all_sightings.append({
                            "species": species_name,
                            "scientific_name": r.get("scientificName", ""),
                            "lat": r.get("decimalLatitude"),
                            "lon": r.get("decimalLongitude"),
                            "event_date": r.get("eventDate"),
                        })
            except Exception as exc:
                logger.warning(f"GBIF fetch failed for {species_name}: {exc}")

        return all_sightings

    def process_data(self, raw: dict[str, Any]) -> dict[str, Any]:
        sst = raw.get("sst_celsius", 28.5)
        sightings = raw.get("sightings", [])

        # Degree Heating Weeks (simplified — assumes 1 week at anomaly)
        from datetime import datetime
        month = datetime.utcnow().month
        from agents.agents.ocean_agent import SST_BASELINE_BY_MONTH
        baseline = SST_BASELINE_BY_MONTH.get(month, 28.5)
        sst_anomaly = max(0.0, sst - baseline)
        dhw = sst_anomaly * 1  # Simplified: 1 week at anomaly

        bleaching_risk_score = min(dhw / BLEACHING_ALERT_2_DHWK, 1.0)
        bleaching_alert_level = (
            "NONE" if dhw < BLEACHING_ALERT_1_DHWK else
            "WATCH" if dhw < BLEACHING_ALERT_2_DHWK else
            "ALERT"
        )

        # Biodiversity index: 0–1 based on species diversity in sightings
        unique_species = len(set(s["species"] for s in sightings))
        biodiversity_index = round(min(unique_species / 5.0, 1.0), 3)

        return {
            "sst_celsius": sst,
            "sst_anomaly_c": round(sst_anomaly, 2),
            "degree_heating_weeks": round(dhw, 2),
            "bleaching_alert_level": bleaching_alert_level,
            "bleaching_risk_score": round(bleaching_risk_score, 3),
            "biodiversity_index": biodiversity_index,
            "unique_species_observed": unique_species,
            "total_sightings": len(sightings),
            "ecosystem_health_score": round(
                (1 - bleaching_risk_score) * 0.6 + biodiversity_index * 0.4, 3
            ),
        }

    def calculate_risk_score(self, observations: dict[str, Any]) -> float:
        bleaching = observations.get("bleaching_risk_score", 0.0)
        health = observations.get("ecosystem_health_score", 1.0)
        return round(bleaching * 0.7 + (1 - health) * 0.3, 3)

    def _detect_anomalies(self, observations: dict) -> list[OrcaAnomaly]:
        anomalies = []
        alert = observations.get("bleaching_alert_level", "NONE")
        if alert in ("WATCH", "ALERT"):
            anomalies.append(OrcaAnomaly(
                anomaly_type="CORAL_BLEACHING_RISK",
                severity="HIGH" if alert == "ALERT" else "MEDIUM",
                confidence=0.70,
                description=(
                    f"Coral bleaching {alert}: DHW={observations['degree_heating_weeks']:.1f} "
                    f"— SST {observations['sst_anomaly_c']:+.1f}°C above baseline"
                ),
            ))
        return anomalies

    async def run(self) -> OrcaEvent:
        # Get latest SST from Redis (published by OceanAgent)
        cached_sst = await self.cache_get("ocean:latest_max_sst")
        if cached_sst:
            try:
                self._latest_sst = float(cached_sst)
            except ValueError:
                pass

        raw = await self.fetch_data()
        observations = self.process_data(raw)
        risk_score = self.calculate_risk_score(observations)
        anomalies = self._detect_anomalies(observations)

        event = OrcaEvent(
            agent_id=self.agent_id,
            observations=observations,
            anomalies=anomalies,
            risk_score=risk_score,
            confidence=0.70,
            data_source="gbif+climatology",
        )

        await self.publish(event, channel=CHANNELS["ecosystem"])
        return event
