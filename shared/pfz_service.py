"""
shared/pfz_service.py
Potential Fishing Zone (PFZ) Intelligence Service.
Interprets oceanographic thermal fronts, chlorophyll convergence zones,
computes distance/bearing from harbors, checks vessel limits and environmental restrictions,
and enforces the distinction between fishing potential and guaranteed catch.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
import math
from typing import Optional

from .decision_kernel import VesselProfile, VerdictType


@dataclass
class PFZZone:
    zone_id: str
    name: str
    sector: str  # Andhra Coast | Tamil Nadu | Kerala | Odisha | Gujarat
    center_lat: float
    center_lon: float
    depth_m: int
    chlorophyll_mg_m3: float
    sst_celsius: float
    thermal_gradient_c_per_km: float
    recommended_species: list[str]
    validity_start: str
    validity_end: str
    restricted_nearby: bool
    restriction_reason: Optional[str] = None


@dataclass
class Harbor:
    harbor_id: str
    name: str
    state: str
    lat: float
    lon: float
    active_fleet_count: int


INDIAN_HARBORS: list[Harbor] = [
    Harbor("H-VIZAG", "Visakhapatnam Fishing Harbor", "Andhra Pradesh", 17.69, 83.30, 750),
    Harbor("H-KAKI", "Kakinada Harbor", "Andhra Pradesh", 16.98, 82.26, 620),
    Harbor("H-CHEN", "Chennai Kasimedu Harbor", "Tamil Nadu", 13.12, 80.30, 890),
    Harbor("H-KOCHI", "Kochi Thoppumpady Harbor", "Kerala", 9.94, 76.26, 940),
    Harbor("H-PARA", "Paradip Fishing Harbor", "Odisha", 20.29, 86.68, 510),
    Harbor("H-VERA", "Veraval Harbor", "Gujarat", 20.90, 70.36, 1200),
]


ACTIVE_PFZ_CATALOG: list[PFZZone] = [
    PFZZone(
        zone_id="PFZ-AP-01",
        name="Visakhapatnam Off-Shelf Convergence",
        sector="Andhra Coast",
        center_lat=17.45,
        center_lon=83.80,
        depth_m=65,
        chlorophyll_mg_m3=1.85,
        sst_celsius=28.4,
        thermal_gradient_c_per_km=0.18,
        recommended_species=["Tuna", "Mackerel", "Ribbonfish"],
        validity_start="2026-09-08T00:00:00Z",
        validity_end="2026-09-10T23:59:59Z",
        restricted_nearby=False,
    ),
    PFZZone(
        zone_id="PFZ-AP-02",
        name="Kakinada Offshore Front",
        sector="Andhra Coast",
        center_lat=16.80,
        center_lon=82.70,
        depth_m=50,
        chlorophyll_mg_m3=2.10,
        sst_celsius=28.1,
        thermal_gradient_c_per_km=0.22,
        recommended_species=["Seer fish", "Carangids", "Shrimp"],
        validity_start="2026-09-08T00:00:00Z",
        validity_end="2026-09-10T23:59:59Z",
        restricted_nearby=False,
    ),
    PFZZone(
        zone_id="PFZ-TN-01",
        name="Chennai Coromandel Eddy",
        sector="Tamil Nadu",
        center_lat=13.35,
        center_lon=80.65,
        depth_m=80,
        chlorophyll_mg_m3=1.65,
        sst_celsius=28.7,
        thermal_gradient_c_per_km=0.15,
        recommended_species=["Skipjack Tuna", "Sardines", "Barracuda"],
        validity_start="2026-09-08T00:00:00Z",
        validity_end="2026-09-10T23:59:59Z",
        restricted_nearby=False,
    ),
    PFZZone(
        zone_id="PFZ-OD-01",
        name="Gahirmatha Coastal Buffer (Restricted)",
        sector="Odisha",
        center_lat=20.65,
        center_lon=87.10,
        depth_m=35,
        chlorophyll_mg_m3=2.80,
        sst_celsius=27.9,
        thermal_gradient_c_per_km=0.24,
        recommended_species=["Hilsa", "Croaker"],
        validity_start="2026-09-08T00:00:00Z",
        validity_end="2026-09-10T23:59:59Z",
        restricted_nearby=True,
        restriction_reason="Within Olive Ridley Turtle Marine Sanctuary sanctuary perimeter — mechanized trawling prohibited.",
    ),
]


def haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate nautical miles between two coordinates."""
    r_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    km = r_km * c
    return km * 0.539957  # Convert km to Nautical Miles


def calculate_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate compass bearing in degrees (0-360)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)
    y = math.sin(dlambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
    bearing = math.degrees(math.atan2(y, x))
    return round((bearing + 360) % 360, 0)


@dataclass
class PFZAssessment:
    zone: PFZZone
    harbor: Harbor
    distance_nm: float
    bearing_deg: float
    travel_time_hours: float
    vessel_suitable: bool
    sea_safety_verdict: VerdictType
    operational_concerns: list[str]
    disclaimer: str

    def to_dict(self) -> dict:
        d = asdict(self)
        d["sea_safety_verdict"] = self.sea_safety_verdict.value
        return d


class PFZService:
    """
    Evaluates published PFZs against harbor distance, vessel capabilities,
    restrictions, and sea safety.
    """

    CATCH_DISCLAIMER = (
        "Scientific Notice: Potential Fishing Zone (PFZ) advisories identify oceanographic "
        "fronts, sea surface temperature gradients, and chlorophyll convergence where pelagic fish "
        "congregate. PFZ forecasts indicate biological potential and do NOT guarantee actual catch."
    )

    @classmethod
    def evaluate_pfzs_for_harbor(
        cls,
        harbor_id: str = "H-VIZAG",
        vessel: Optional[VesselProfile] = None,
        wave_height_m: float = 1.3,
        wind_kmph: float = 22.0,
    ) -> list[PFZAssessment]:
        if vessel is None:
            vessel = VesselProfile.default_mechanized()

        harbor = next((h for h in INDIAN_HARBORS if h.harbor_id == harbor_id), INDIAN_HARBORS[0])
        results: list[PFZAssessment] = []

        for p in ACTIVE_PFZ_CATALOG:
            dist = round(haversine_nm(harbor.lat, harbor.lon, p.center_lat, p.center_lon), 1)
            bearing = calculate_bearing_deg(harbor.lat, harbor.lon, p.center_lat, p.center_lon)
            hours = round(dist / max(vessel.cruise_speed_knots, 1.0), 1)

            concerns: list[str] = []
            suitable = True

            # Distance check against vessel class
            if vessel.vessel_type == "TRADITIONAL_MOTORIZED" and dist > 20.0:
                suitable = False
                concerns.append(f"Distance ({dist} NM) exceeds traditional craft safe range (20 NM max).")

            if p.restricted_nearby:
                concerns.append(p.restriction_reason or "Environmental marine restriction active.")
                suitable = False

            # Wave check
            if wave_height_m > vessel.max_wave_height_m:
                verdict = VerdictType.PROHIBITED
                concerns.append(f"Current wave height ({wave_height_m}m) exceeds vessel safety cap.")
            elif wave_height_m >= vessel.max_wave_height_m * 0.8:
                verdict = VerdictType.CAUTION
                concerns.append("Sea conditions nearing vessel limit; caution required.")
            else:
                verdict = VerdictType.SAFE

            results.append(
                PFZAssessment(
                    zone=p,
                    harbor=harbor,
                    distance_nm=dist,
                    bearing_deg=bearing,
                    travel_time_hours=hours,
                    vessel_suitable=suitable,
                    sea_safety_verdict=verdict,
                    operational_concerns=concerns,
                    disclaimer=cls.CATCH_DISCLAIMER,
                )
            )

        # Sort by proximity
        results.sort(key=lambda x: x.distance_nm)
        return results
