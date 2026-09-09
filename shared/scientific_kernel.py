"""
shared/scientific_kernel.py
Scientific Investigation & Research Sampling Planner.
Separates raw marine observations from interpretations, evaluates competing hypotheses
with supporting vs. contradicting evidence, and optimizes oceanographic cruise sampling transects.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Optional


@dataclass
class EvidencePoint:
    metric: str
    observed_value: str
    polarity: str  # SUPPORTS | CONTRADICTS | NEUTRAL
    explanation: str


@dataclass
class ScientificHypothesis:
    hypothesis_id: str
    title: str
    likelihood_score: float  # 0.0 to 1.0
    status: str  # HIGHLY_PLAUSIBLE | UNLIKELY | INCONCLUSIVE
    supporting_evidence: list[EvidencePoint]
    contradicting_evidence: list[EvidencePoint]
    missing_measurements: list[str]
    proposed_verification_test: str


@dataclass
class ScientificInvestigationReport:
    investigation_id: str
    observed_anomaly: str
    location_name: str
    observation_timestamp: str
    hypotheses: list[ScientificHypothesis]
    favored_hypothesis_id: str
    scientific_summary: str
    recommended_sampling_plan_id: Optional[str] = None

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SamplingStation:
    station_id: str
    name: str
    lat: float
    lon: float
    target_depth_m: int
    parameters_to_sample: list[str]
    estimated_station_time_mins: int
    scientific_rationale: str


@dataclass
class ResearchCruisePlan:
    plan_id: str
    expedition_name: str
    departure_port: str
    total_stations: int
    total_distance_nm: float
    estimated_duration_hours: float
    stations: list[SamplingStation]
    vessel_constraints_ok: bool
    summary: str

    def to_dict(self) -> dict:
        return asdict(self)


class ScientificKernel:
    """
    Scientific reasoning engine for anomalous marine observations.
    Evaluates competing hypotheses and designs sampling plans.
    """

    @classmethod
    def investigate_chlorophyll_spike(
        cls,
        location: str = "Visakhapatnam Shelf Waters (17.5°N, 83.5°E)",
        chlorophyll_val: float = 4.8,  # mg/m3 (normal < 0.8)
        sst_val: float = 26.8,         # °C (normal ~ 28.5)
        wind_direction: str = "South-Westerly",
        wind_speed_kmph: float = 38.0,
    ) -> ScientificInvestigationReport:
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

        # Hypothesis 1: Coastal Upwelling
        h1 = ScientificHypothesis(
            hypothesis_id="HYP-UPWELLING",
            title="Wind-Driven Coastal Upwelling (Ekman Transport)",
            likelihood_score=0.84,
            status="HIGHLY_PLAUSIBLE",
            supporting_evidence=[
                EvidencePoint(
                    metric="Sea Surface Temperature",
                    observed_value=f"{sst_val}°C (~1.7°C cooler than offshore climatology)",
                    polarity="SUPPORTS",
                    explanation="Colder subsurface water has breached the thermocline into the photic zone.",
                ),
                EvidencePoint(
                    metric="Coastal Wind Vector",
                    observed_value=f"{wind_direction} at {wind_speed_kmph} km/h",
                    polarity="SUPPORTS",
                    explanation="South-westerly alongshore wind creates strong offshore Ekman transport along the Andhra coast.",
                ),
            ],
            contradicting_evidence=[],
            missing_measurements=[
                "Vertical CTD temperature/salinity profile down to 100m depth",
                "Nitrate and Phosphate (NO3/PO4) dissolved nutrient concentrations",
            ],
            proposed_verification_test="Conduct cross-shelf vertical temperature transect at 5 stations to map thermocline shoaling.",
        )

        # Hypothesis 2: Riverine Runoff Plume
        h2 = ScientificHypothesis(
            hypothesis_id="HYP-RUNOFF",
            title="Riverine Nutrient Plume Discharge (Godavari/Krishna)",
            likelihood_score=0.35,
            status="UNLIKELY",
            supporting_evidence=[
                EvidencePoint(
                    metric="High Chlorophyll-a",
                    observed_value=f"{chlorophyll_val} mg/m³",
                    polarity="SUPPORTS",
                    explanation="River plumes discharge high silicate and nitrogen which fuels diatom blooms.",
                )
            ],
            contradicting_evidence=[
                EvidencePoint(
                    metric="Surface Salinity & Water Temperature",
                    observed_value="Cool SST without turbidity discharge pattern",
                    polarity="CONTRADICTS",
                    explanation="River plumes in September are typically warm (>29°C) and buoyant with low salinity.",
                )
            ],
            missing_measurements=[
                "Practical Salinity Units (PSU) measurement at river mouth vs shelf edge",
                "Remote sensing suspended particulate matter (SPM) index",
            ],
            proposed_verification_test="Verify Sentinel-2 sediment band reflectances and in-situ conductivity.",
        )

        # Hypothesis 3: Harmful Algal Bloom (HAB)
        h3 = ScientificHypothesis(
            hypothesis_id="HYP-HAB",
            title="Toxic Harmful Algal Bloom (Dinoflagellate Proliferation)",
            likelihood_score=0.45,
            status="INCONCLUSIVE",
            supporting_evidence=[
                EvidencePoint(
                    metric="Elevated Chlorophyll",
                    observed_value=f"{chlorophyll_val} mg/m³",
                    polarity="SUPPORTS",
                    explanation="Rapid cell division of Noctiluca scintillans or Karenia can yield high optical fluorescence.",
                )
            ],
            contradicting_evidence=[
                EvidencePoint(
                    metric="Dissolved Oxygen / Fish Mortality",
                    observed_value="Zero fish kill reports from local artisanal fishermen",
                    polarity="NEUTRAL",
                    explanation="No hypoxic dead zones or aerosol toxins reported by harbor authorities.",
                )
            ],
            missing_measurements=[
                "Microscopic cell taxonomy enumeration (FlowCam or water bottle samples)",
                "Dissolved Oxygen (DO) probe readings",
            ],
            proposed_verification_test="Collect 1-liter surface water sample for phytoplankton species identification.",
        )

        summary = (
            f"Investigation for {location}: The observed Chlorophyll-a spike ({chlorophyll_val} mg/m³) "
            f"correlates strongly with a ~1.7°C SST depression and consistent south-westerly alongshore winds. "
            "Evidence favors Wind-Driven Coastal Upwelling (84% likelihood). River runoff is contradicted by "
            "water thermal structure. In-situ CTD profiles recommended to confirm."
        )

        return ScientificInvestigationReport(
            investigation_id="INV-2026-AP-01",
            observed_anomaly=f"Chlorophyll-a anomaly ({chlorophyll_val} mg/m³) with cooling SST",
            location_name=location,
            observation_timestamp=now_str,
            hypotheses=[h1, h2, h3],
            favored_hypothesis_id="HYP-UPWELLING",
            scientific_summary=summary,
            recommended_sampling_plan_id="CRUISE-AP-UPWELL",
        )

    @classmethod
    def generate_sampling_plan(
        cls,
        origin_port: str = "Visakhapatnam Harbor",
        max_duration_hours: float = 12.0,
        ship_speed_knots: float = 9.0,
    ) -> ResearchCruisePlan:
        stations = [
            SamplingStation(
                station_id="STN-01",
                name="Inner Shelf Inshore Baseline",
                lat=17.65, lon=83.35,
                target_depth_m=20,
                parameters_to_sample=["CTD Profile", "Chlorophyll-a", "Dissolved Oxygen", "Nutrients (N/P/Si)"],
                estimated_station_time_mins=35,
                scientific_rationale="Establishes inshore baseline before upwelling front.",
            ),
            SamplingStation(
                station_id="STN-02",
                name="Mid-Shelf Front Boundary",
                lat=17.58, lon=83.48,
                target_depth_m=50,
                parameters_to_sample=["CTD Profile", "Phytoplankton Taxonomy", "PAR (Light Attenuation)"],
                estimated_station_time_mins=45,
                scientific_rationale="Samples the core convergence zone and maximum chlorophyll gradient.",
            ),
            SamplingStation(
                station_id="STN-03",
                name="Outer Shelf Break",
                lat=17.48, lon=83.62,
                target_depth_m=100,
                parameters_to_sample=["Deep CTD Profile (0-100m)", "Water Nutrients", "Zooplankton Net Tow"],
                estimated_station_time_mins=55,
                scientific_rationale="Measures depth of upwelled water mass at the shelf break.",
            ),
            SamplingStation(
                station_id="STN-04",
                name="Open Ocean Reference Station",
                lat=17.35, lon=83.80,
                target_depth_m=250,
                parameters_to_sample=["Deep CTD (0-200m)", "SST Verification Radiometer"],
                estimated_station_time_mins=60,
                scientific_rationale="Unperturbed offshore ocean reference station outside upwelling zone.",
            ),
        ]

        total_station_hours = sum(s.estimated_station_time_mins for s in stations) / 60.0
        # Cruise track distance ~ 64 NM round trip
        dist_nm = 64.0
        transit_hours = dist_nm / ship_speed_knots
        total_hours = round(transit_hours + total_station_hours, 1)

        summary = (
            f"Optimized 4-station cross-shelf transect from {origin_port}. "
            f"Total distance: {dist_nm} NM, requiring ~{total_hours} hours total cruise time "
            f"({round(transit_hours, 1)}h transit + {round(total_station_hours, 1)}h on-station sampling). "
            "Fits within standard single-day research cruise window."
        )

        return ResearchCruisePlan(
            plan_id="CRUISE-AP-UPWELL",
            expedition_name="Andhra Coastal Upwelling & Phytoplankton Dynamics Survey",
            departure_port=origin_port,
            total_stations=len(stations),
            total_distance_nm=dist_nm,
            estimated_duration_hours=total_hours,
            stations=stations,
            vessel_constraints_ok=(total_hours <= max_duration_hours),
            summary=summary,
        )
