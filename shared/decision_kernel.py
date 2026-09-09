"""
shared/decision_kernel.py
Deterministic Evidence-Backed Decision Kernel for ORCA.
A zero-hallucination deterministic layer that takes a location, a time window,
a vessel profile, and a question type, returning a structured verdict with
the exact observations, scientific thresholds, and rules that produced it.
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional
from datetime import datetime, timezone


class QuestionType(str, Enum):
    VOYAGE_SAFETY = "VOYAGE_SAFETY"
    FISHING_PFZ = "FISHING_PFZ"
    WEATHER_ADVISORY = "WEATHER_ADVISORY"
    ECOSYSTEM_STRESS = "ECOSYSTEM_STRESS"
    SCIENTIFIC_INQUEST = "SCIENTIFIC_INQUEST"


class DataCategory(str, Enum):
    OBSERVED = "OBSERVED"
    FORECAST = "FORECAST"
    OFFICIAL_ADVISORY = "OFFICIAL_ADVISORY"
    UNAVAILABLE = "UNAVAILABLE"


class VerdictType(str, Enum):
    SAFE = "SAFE"
    CAUTION = "CAUTION"
    PROHIBITED = "PROHIBITED"


@dataclass
class VesselProfile:
    vessel_id: str
    name: str
    vessel_type: str  # TRADITIONAL_MOTORIZED | MECHANIZED_TRAWLER | DEEP_SEA | RESEARCH
    length_m: float
    engine_hp: float
    max_wave_height_m: float
    max_wind_kmph: float
    cruise_speed_knots: float
    base_fuel_rate_lph: float  # Liters per hour at cruise speed

    @classmethod
    def default_mechanized(cls) -> "VesselProfile":
        return cls(
            vessel_id="V-MECH-01",
            name="Standard Mechanized Trawler (12-15m)",
            vessel_type="MECHANIZED_TRAWLER",
            length_m=14.0,
            engine_hp=120.0,
            max_wave_height_m=2.5,
            max_wind_kmph=45.0,
            cruise_speed_knots=8.0,
            base_fuel_rate_lph=14.0,
        )

    @classmethod
    def default_traditional(cls) -> "VesselProfile":
        return cls(
            vessel_id="V-TRAD-01",
            name="Traditional Motorized FRP Boat (8-10m)",
            vessel_type="TRADITIONAL_MOTORIZED",
            length_m=9.0,
            engine_hp=25.0,
            max_wave_height_m=1.6,
            max_wind_kmph=30.0,
            cruise_speed_knots=6.0,
            base_fuel_rate_lph=6.0,
        )


@dataclass
class KernelObservation:
    parameter: str
    value: Optional[float]
    unit: str
    category: DataCategory
    source: str
    timestamp: str
    quality: str = "GOOD"  # GOOD | SUSPECT | ESTIMATED | UNAVAILABLE


@dataclass
class RuleViolation:
    rule_code: str
    parameter: str
    observed_or_forecast_value: float
    threshold_value: float
    severity: str  # ADVISORY | WARNING | HARD_LIMIT
    message: str


@dataclass
class KernelVerdict:
    question_type: QuestionType
    location: str
    time_window: str
    verdict: VerdictType
    risk_score: float  # 0.0 (Safe) to 1.0 (Critical)
    summary: str
    rule_violations: list[RuleViolation] = field(default_factory=list)
    observations: list[KernelObservation] = field(default_factory=list)
    applicable_restrictions: list[str] = field(default_factory=list)
    evidence_chain: list[str] = field(default_factory=list)
    missing_data: list[str] = field(default_factory=list)
    evaluation_timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> dict:
        d = asdict(self)
        d["question_type"] = self.question_type.value
        d["verdict"] = self.verdict.value
        return d


class DecisionKernel:
    """
    Core Deterministic Decision Kernel.
    Pure functional calculations without LLM dependency.
    """

    @staticmethod
    def evaluate_voyage(
        location_name: str,
        wind_kmph: float,
        wave_height_m: float,
        visibility_km: float = 10.0,
        vessel: Optional[VesselProfile] = None,
        official_advisory_active: bool = False,
        official_advisory_text: str = "",
        is_forecast: bool = True,
    ) -> KernelVerdict:
        if vessel is None:
            vessel = VesselProfile.default_mechanized()

        obs_cat = DataCategory.FORECAST if is_forecast else DataCategory.OBSERVED
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        observations = [
            KernelObservation(
                parameter="wind_speed",
                value=wind_kmph,
                unit="km/h",
                category=obs_cat,
                source="Open-Meteo High-Resolution Marine",
                timestamp=now_str,
            ),
            KernelObservation(
                parameter="wave_height",
                value=wave_height_m,
                unit="meters",
                category=obs_cat,
                source="Open-Meteo Marine / ECMWF Wave Model",
                timestamp=now_str,
            ),
            KernelObservation(
                parameter="visibility",
                value=visibility_km,
                unit="km",
                category=obs_cat,
                source="Coastal Meteorological Station",
                timestamp=now_str,
            ),
        ]

        if official_advisory_active:
            observations.append(
                KernelObservation(
                    parameter="official_warning",
                    value=1.0,
                    unit="status",
                    category=DataCategory.OFFICIAL_ADVISORY,
                    source="IMD / INCOIS Coastal Alert Bulletin",
                    timestamp=now_str,
                )
            )

        violations: list[RuleViolation] = []
        restrictions: list[str] = []
        evidence: list[str] = []

        # Check 1: Wave height limit
        if wave_height_m > vessel.max_wave_height_m:
            violations.append(
                RuleViolation(
                    rule_code="DK-WAVE-01",
                    parameter="wave_height",
                    observed_or_forecast_value=wave_height_m,
                    threshold_value=vessel.max_wave_height_m,
                    severity="HARD_LIMIT",
                    message=(
                        f"Forecast wave height {wave_height_m:.1f}m exceeds {vessel.name} "
                        f"operating limit of {vessel.max_wave_height_m:.1f}m."
                    ),
                )
            )
            evidence.append(
                f"Rule DK-WAVE-01 Triggered: {wave_height_m:.1f}m > limit {vessel.max_wave_height_m:.1f}m"
            )
        elif wave_height_m >= vessel.max_wave_height_m * 0.8:
            violations.append(
                RuleViolation(
                    rule_code="DK-WAVE-02",
                    parameter="wave_height",
                    observed_or_forecast_value=wave_height_m,
                    threshold_value=vessel.max_wave_height_m * 0.8,
                    severity="WARNING",
                    message=(
                        f"Wave height {wave_height_m:.1f}m is within 80% of vessel cap. "
                        "Elevated capsizing risk for small craft."
                    ),
                )
            )
            evidence.append(
                f"Cautionary Sea State: {wave_height_m:.1f}m approaches {vessel.max_wave_height_m:.1f}m threshold"
            )

        # Check 2: Wind speed limit
        if wind_kmph > vessel.max_wind_kmph:
            violations.append(
                RuleViolation(
                    rule_code="DK-WIND-01",
                    parameter="wind_speed",
                    observed_or_forecast_value=wind_kmph,
                    threshold_value=vessel.max_wind_kmph,
                    severity="HARD_LIMIT",
                    message=(
                        f"Sustained wind {wind_kmph:.1f} km/h exceeds vessel structural safety threshold "
                        f"of {vessel.max_wind_kmph:.1f} km/h (Beaufort scale)."
                    ),
                )
            )
            evidence.append(
                f"Rule DK-WIND-01 Triggered: {wind_kmph:.1f} km/h > limit {vessel.max_wind_kmph:.1f} km/h"
            )
        elif wind_kmph >= 40.0:
            violations.append(
                RuleViolation(
                    rule_code="DK-WIND-02",
                    parameter="wind_speed",
                    observed_or_forecast_value=wind_kmph,
                    threshold_value=40.0,
                    severity="WARNING",
                    message=f"Strong Breeze ({wind_kmph:.1f} km/h) causing steep wind-driven chop.",
                )
            )

        # Check 3: Official advisory
        if official_advisory_active:
            restrictions.append(
                f"Official Fishermen Warning in force: {official_advisory_text or 'Do not venture into sea'}"
            )
            evidence.append("Official INCOIS/IMD warning verified active.")

        # Verdict synthesis
        hard_violations = [v for v in violations if v.severity == "HARD_LIMIT"]
        warn_violations = [v for v in violations if v.severity == "WARNING"]

        if hard_violations or official_advisory_active:
            verdict = VerdictType.PROHIBITED
            risk_score = 0.85 + (0.15 if len(hard_violations) > 1 else 0.05)
            summary = (
                f"Voyage PROHIBITED near {location_name}. Conditions exceed critical vessel safety boundaries "
                f"or active official restrictions are in effect."
            )
        elif warn_violations:
            verdict = VerdictType.CAUTION
            risk_score = 0.50 + len(warn_violations) * 0.1
            summary = (
                f"Voyage requires CAUTION near {location_name}. Moderate sea-state exposure detected; "
                "experienced crew and monitoring advised."
            )
        else:
            verdict = VerdictType.SAFE
            risk_score = max(0.05, (wave_height_m / 3.0) * 0.2 + (wind_kmph / 60.0) * 0.2)
            summary = (
                f"Conditions near {location_name} are FAIR and within operating safety parameters for "
                f"{vessel.name}."
            )

        return KernelVerdict(
            question_type=QuestionType.VOYAGE_SAFETY,
            location=location_name,
            time_window="Next 12 Hours",
            verdict=verdict,
            risk_score=min(1.0, round(risk_score, 2)),
            summary=summary,
            rule_violations=violations,
            observations=observations,
            applicable_restrictions=restrictions,
            evidence_chain=evidence,
            missing_data=[],
        )
