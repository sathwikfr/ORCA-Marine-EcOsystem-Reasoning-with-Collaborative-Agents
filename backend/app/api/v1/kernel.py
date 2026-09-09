"""
backend/app/api/v1/kernel.py
Endpoints for Deterministic Decision Kernel, What-If Voyage Engine, PFZ Intelligence,
and Scientific Investigation.
"""

from typing import Optional
from fastapi import APIRouter, Query

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../../"))
from shared.decision_kernel import DecisionKernel, VesselProfile
from shared.what_if_planner import WhatIfPlanner
from shared.pfz_service import PFZService
from shared.scientific_kernel import ScientificKernel

router = APIRouter(prefix="/kernel", tags=["Decision Kernel & Operational Intelligence"])


@router.get("/evaluate")
async def evaluate_decision(
    location: str = Query("Visakhapatnam Harbor", description="Coastal location or zone"),
    wind_kmph: float = Query(28.0, description="Wind speed in km/h"),
    wave_height_m: float = Query(1.8, description="Significant wave height in meters"),
    vessel_type: str = Query("MECHANIZED_TRAWLER", description="MECHANIZED_TRAWLER or TRADITIONAL_MOTORIZED"),
    official_warning: bool = Query(False, description="Whether an official IMD/INCOIS warning is in effect"),
):
    """
    Run deterministic decision kernel: computes mathematical safety verdict and rule violations.
    """
    vessel = (
        VesselProfile.default_traditional()
        if vessel_type == "TRADITIONAL_MOTORIZED"
        else VesselProfile.default_mechanized()
    )
    verdict = DecisionKernel.evaluate_voyage(
        location_name=location,
        wind_kmph=wind_kmph,
        wave_height_m=wave_height_m,
        vessel=vessel,
        official_advisory_active=official_warning,
    )
    return verdict.to_dict()


@router.get("/what-if")
async def evaluate_what_if(
    origin: str = Query("Visakhapatnam Harbor", description="Departure port"),
    destination: str = Query("Outer Shelf PFZ (42 NM offshore)", description="Target destination"),
    distance_nm: float = Query(42.0, description="Nautical miles one way"),
    activity_hours: float = Query(4.0, description="Time spent at destination"),
    vessel_type: str = Query("MECHANIZED_TRAWLER", description="Vessel profile type"),
):
    """
    Compare alternative departure windows (-4h, scheduled, +6h) and routes for fuel and hazard exposure.
    """
    vessel = (
        VesselProfile.default_traditional()
        if vessel_type == "TRADITIONAL_MOTORIZED"
        else VesselProfile.default_mechanized()
    )
    report = WhatIfPlanner.evaluate_scenario(
        origin_port=origin,
        destination=destination,
        distance_nm=distance_nm,
        activity_duration_hours=activity_hours,
        vessel=vessel,
    )
    return report.to_dict()


@router.get("/pfz")
async def get_pfz_advisories(
    harbor_id: str = Query("H-VIZAG", description="Origin harbor ID (e.g. H-VIZAG, H-KAKI, H-CHEN, H-KOCHI)"),
    vessel_type: str = Query("MECHANIZED_TRAWLER", description="Vessel class"),
    wave_height_m: float = Query(1.3, description="Current wave height"),
):
    """
    Return active Potential Fishing Zones (PFZ) ranked by nautical proximity with safety assessments.
    """
    vessel = (
        VesselProfile.default_traditional()
        if vessel_type == "TRADITIONAL_MOTORIZED"
        else VesselProfile.default_mechanized()
    )
    assessments = PFZService.evaluate_pfzs_for_harbor(
        harbor_id=harbor_id,
        vessel=vessel,
        wave_height_m=wave_height_m,
    )
    return {
        "harbor_id": harbor_id,
        "pfz_count": len(assessments),
        "assessments": [a.to_dict() for a in assessments],
        "disclaimer": PFZService.CATCH_DISCLAIMER,
    }


@router.get("/investigate")
async def scientific_investigation(
    location: str = Query("Visakhapatnam Shelf Waters (17.5°N, 83.5°E)", description="Area of observed anomaly"),
    chlorophyll: float = Query(4.8, description="Observed Chlorophyll-a (mg/m3)"),
    sst: float = Query(26.8, description="Observed SST (°C)"),
):
    """
    Generate competing scientific hypotheses with supporting vs contradicting evidence.
    """
    report = ScientificKernel.investigate_chlorophyll_spike(
        location=location,
        chlorophyll_val=chlorophyll,
        sst_val=sst,
    )
    return report.to_dict()


@router.get("/sampling-plan")
async def research_sampling_plan(
    port: str = Query("Visakhapatnam Harbor", description="Departure port"),
    max_hours: float = Query(12.0, description="Max cruise duration in hours"),
):
    """
    Generate optimized research vessel CTD and water sampling transect.
    """
    plan = ScientificKernel.generate_sampling_plan(
        origin_port=port,
        max_duration_hours=max_hours,
    )
    return plan.to_dict()
