"""
agents/agents/disaster_reasoning_agent.py
DisasterReasoningAgent: Synthesizes domain agent outputs into a structured risk assessment.
Uses rule-based checks first, then combines into a probability score.
"""

import logging
from dataclasses import dataclass, field, asdict
from typing import Any

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../"))
from shared.orca_event import OrcaEvent, OrcaAnomaly
from shared.severity import AlertLevel, DisasterType
from ..core.base_agent import BaseAgent
from ..core.redis_bus import CHANNELS

logger = logging.getLogger(__name__)


@dataclass
class RuleFlag:
    rule_id: str
    disaster_type: DisasterType
    triggered: bool
    confidence: float
    description: str
    severity: str  # LOW | MEDIUM | HIGH | CRITICAL


@dataclass
class RiskAssessment:
    disaster_type: DisasterType
    probability: float          # 0.0–1.0
    confidence: float           # 0.0–1.0
    alert_level: AlertLevel
    severity_level: int         # 1–5
    rule_flags: list[RuleFlag]
    primary_indicators: list[str]
    preliminary_actions: list[str]
    contributing_agents: list[str]
    raw_scores: dict[str, float]

    def to_dict(self) -> dict:
        d = asdict(self)
        d["disaster_type"] = self.disaster_type.value
        d["alert_level"] = self.alert_level.value
        return d


# ── Rule definitions ──────────────────────────────────────────────────────────

CYCLONE_RULES = [
    {
        "id": "CY-01",
        "desc": "Wind speed ≥ 89 km/h (Beaufort Storm force)",
        "check": lambda w, o, s, e: (w.get("max_wind_kmph", 0) or 0) >= 89,
        "weight": 0.35, "confidence": 0.92,
    },
    {
        "id": "CY-02",
        "desc": "Atmospheric pressure < 990 hPa",
        "check": lambda w, o, s, e: (w.get("min_pressure_hpa", 1013) or 1013) < 990,
        "weight": 0.30, "confidence": 0.88,
    },
    {
        "id": "CY-03",
        "desc": "SST ≥ 28°C (fuel for cyclone intensification)",
        "check": lambda w, o, s, e: (o.get("max_sst_celsius", 0) or 0) >= 28.0,
        "weight": 0.20, "confidence": 0.75,
    },
    {
        "id": "CY-04",
        "desc": "Wave height ≥ 3.5m",
        "check": lambda w, o, s, e: (o.get("max_wave_height_m", 0) or 0) >= 3.5,
        "weight": 0.15, "confidence": 0.80,
    },
]

OIL_SPILL_RULES = [
    {
        "id": "OS-01",
        "desc": "Satellite oil spill anomaly detected",
        "check": lambda w, o, s, e: s.get("oil_spill_detected", False),
        "weight": 0.80, "confidence": 0.85,
    },
    {
        "id": "OS-02",
        "desc": "Tanker vessel in anomalous position",
        "check": lambda w, o, s, e: e.get("tanker_anomaly_detected", False),
        "weight": 0.20, "confidence": 0.60,
    },
]

HAB_RULES = [
    {
        "id": "HA-01",
        "desc": "Satellite algal bloom detected",
        "check": lambda w, o, s, e: s.get("algal_bloom_detected", False),
        "weight": 0.50, "confidence": 0.80,
    },
    {
        "id": "HA-02",
        "desc": "SST anomaly ≥ 2°C (bloom precursor)",
        "check": lambda w, o, s, e: (o.get("max_sst_anomaly_c", 0) or 0) >= 2.0,
        "weight": 0.30, "confidence": 0.70,
    },
    {
        "id": "HA-03",
        "desc": "Coral bleaching alert level ≥ WATCH",
        "check": lambda w, o, s, e: e.get("bleaching_alert_level") in ("WATCH", "ALERT"),
        "weight": 0.20, "confidence": 0.65,
    },
]

DISASTER_PRELIMINARY_ACTIONS = {
    DisasterType.CYCLONE: [
        "Alert all fishing vessels within 300km to return to port",
        "Pre-position NDRF teams at coastal districts",
        "Activate State Emergency Operation Centres",
        "Issue coastal inundation warning to district collectors",
        "Close ports — restrict outgoing vessel movement",
    ],
    DisasterType.OIL_SPILL: [
        "Alert Coast Guard for containment deployment",
        "Notify Indian Coast Guard District HQ",
        "Issue No-Fishing advisory for affected zone",
        "Prepare oil boom and skimmer equipment",
        "Notify state fisheries department",
    ],
    DisasterType.HARMFUL_ALGAL_BLOOM: [
        "Issue No-Fishing advisory — possible toxin contamination",
        "Alert FSSAI for seafood safety monitoring",
        "Notify aquaculture farms in affected zone",
        "Deploy water quality sampling teams",
    ],
    DisasterType.UNKNOWN: [
        "Continue enhanced monitoring — collect more data",
        "Alert regional coast guard for visual survey",
    ],
}


class DisasterReasoningAgent(BaseAgent):
    """
    Reads outputs from all 5 domain agents, applies rule-based scoring,
    classifies disaster type and probability, assigns alert level.
    """

    def __init__(self, redis_url: str):
        super().__init__(
            agent_id="disaster_reasoning_agent",
            display_name="Disaster Reasoning Agent",
            redis_url=redis_url,
        )

    # BaseAgent abstract methods (this agent runs on demand, not on a timer)
    async def fetch_data(self) -> Any:
        return None

    def process_data(self, raw: Any) -> dict:
        return {}

    def calculate_risk_score(self, observations: dict) -> float:
        return 0.0

    async def run(self) -> OrcaEvent:
        # Not used directly — use reason() instead
        return OrcaEvent.error_event(self.agent_id, "Use reason() method")

    # ── Core reasoning method ─────────────────────────────────────────────

    def reason(
        self,
        weather_obs: dict,
        ocean_obs: dict,
        satellite_obs: dict,
        vessel_obs: dict,
        ecosystem_obs: dict,
    ) -> RiskAssessment:
        """
        Main reasoning method. Called by CoordinatorAgent after all domain agents complete.
        Returns a RiskAssessment with disaster type, probability, and actions.
        """
        # Per-disaster rule evaluation
        cyclone_score = self._evaluate_rules(
            CYCLONE_RULES, weather_obs, ocean_obs, satellite_obs, ecosystem_obs
        )
        oil_score = self._evaluate_rules(
            OIL_SPILL_RULES, weather_obs, ocean_obs, satellite_obs, ecosystem_obs
        )
        hab_score = self._evaluate_rules(
            HAB_RULES, weather_obs, ocean_obs, satellite_obs, ecosystem_obs
        )

        # Pick most likely disaster
        scores = {
            DisasterType.CYCLONE: cyclone_score,
            DisasterType.OIL_SPILL: oil_score,
            DisasterType.HARMFUL_ALGAL_BLOOM: hab_score,
        }
        best_type = max(scores, key=lambda k: scores[k])
        best_prob = scores[best_type]

        if best_prob < 0.20:
            best_type = DisasterType.UNKNOWN

        alert_level = AlertLevel.from_probability(best_prob)
        severity = max(1, int(best_prob * 5))

        # Collect all triggered rule flags for transparency
        all_flags = (
            self._get_flags(CYCLONE_RULES, DisasterType.CYCLONE,
                            weather_obs, ocean_obs, satellite_obs, ecosystem_obs)
            + self._get_flags(OIL_SPILL_RULES, DisasterType.OIL_SPILL,
                              weather_obs, ocean_obs, satellite_obs, ecosystem_obs)
            + self._get_flags(HAB_RULES, DisasterType.HARMFUL_ALGAL_BLOOM,
                              weather_obs, ocean_obs, satellite_obs, ecosystem_obs)
        )

        triggered_flags = [f for f in all_flags if f.triggered]
        indicators = [f.description for f in triggered_flags]

        # Confidence = average confidence of triggered rules
        conf = (
            sum(f.confidence for f in triggered_flags) / len(triggered_flags)
            if triggered_flags else 0.5
        )

        return RiskAssessment(
            disaster_type=best_type,
            probability=round(best_prob, 3),
            confidence=round(conf, 3),
            alert_level=alert_level,
            severity_level=severity,
            rule_flags=all_flags,
            primary_indicators=indicators,
            preliminary_actions=DISASTER_PRELIMINARY_ACTIONS.get(
                best_type, DISASTER_PRELIMINARY_ACTIONS[DisasterType.UNKNOWN]
            ),
            contributing_agents=[
                "weather_agent", "ocean_agent",
                "satellite_agent", "vessel_agent", "ecosystem_agent"
            ],
            raw_scores={k.value: round(v, 3) for k, v in scores.items()},
        )

    def _evaluate_rules(
        self, rules: list[dict], w: dict, o: dict, s: dict, e: dict
    ) -> float:
        """Sum weighted scores of all triggered rules → capped at 1.0."""
        total = sum(
            r["weight"] for r in rules if r["check"](w, o, s, e)
        )
        return min(total, 1.0)

    def _get_flags(
        self, rules: list[dict], dtype: DisasterType,
        w: dict, o: dict, s: dict, e: dict
    ) -> list[RuleFlag]:
        flags = []
        for r in rules:
            triggered = r["check"](w, o, s, e)
            flags.append(RuleFlag(
                rule_id=r["id"],
                disaster_type=dtype,
                triggered=triggered,
                confidence=r["confidence"],
                description=r["desc"],
                severity="HIGH" if r["weight"] >= 0.30 else "MEDIUM",
            ))
        return flags
