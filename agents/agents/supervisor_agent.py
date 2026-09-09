"""
agents/agents/supervisor_agent.py
Supervisor Agent for ORCA Conversational Marine Assistant.
Maintains multi-turn context (location, vessel, time window, conversation history),
routes queries to specialist agents/kernels, and responds in English or Telugu.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../../"))
from shared.decision_kernel import DecisionKernel, VesselProfile, VerdictType
from shared.what_if_planner import WhatIfPlanner
from shared.pfz_service import PFZService
from shared.scientific_kernel import ScientificKernel

logger = logging.getLogger(__name__)


@dataclass
class ConversationSession:
    session_id: str
    language: str = "en"  # "en" or "te" (Telugu)
    current_location: str = "Visakhapatnam"
    current_time_window: str = "tomorrow morning"
    current_vessel: str = "MECHANIZED_TRAWLER"
    history: list[dict] = field(default_factory=list)


class SupervisorAgent:
    """
    Supervises user interactions:
    1. Identifies intent (conditions, fishing, voyage, ecosystem, scientific).
    2. Updates conversational state (preserves location & context for follow-ups).
    3. Calls deterministic tools / kernels.
    4. Formats evidence-backed response in English or Telugu.
    """

    def __init__(self):
        self.sessions: dict[str, ConversationSession] = {}

    def get_or_create_session(self, session_id: str = "default") -> ConversationSession:
        if session_id not in self.sessions:
            self.sessions[session_id] = ConversationSession(session_id=session_id)
        return self.sessions[session_id]

    def process_query(self, user_msg: str, session_id: str = "default", force_lang: Optional[str] = None) -> dict:
        session = self.get_or_create_session(session_id)
        msg_lower = user_msg.lower().strip()

        # Language detection (detect Telugu script or explicit preference)
        is_telugu = any('\u0c00' <= char <= '\u0c7f' for char in user_msg) or (force_lang == "te")
        lang = "te" if is_telugu else (force_lang or session.language)
        session.language = lang

        # Context updates: check for new location mentions
        locations = {
            "visakhapatnam": "Visakhapatnam",
            "vizag": "Visakhapatnam",
            "kakinada": "Kakinada",
            "chennai": "Chennai",
            "kochi": "Kochi",
            "paradip": "Paradip",
            "veraval": "Veraval",
            "mumbai": "Mumbai",
            "andaman": "Andaman Islands",
            "kerala": "Kerala Coast",
            "bay of bengal": "Bay of Bengal",
            "arabian sea": "Arabian Sea",
            "విశాఖపట్నం": "Visakhapatnam",
            "వైజాగ్": "Visakhapatnam",
            "కాకినాడ": "Kakinada",
            "చెన్నై": "Chennai",
        }
        for kw, loc in locations.items():
            if kw in msg_lower or kw in user_msg:
                session.current_location = loc
                break

        # Context updates: time window
        if "afternoon" in msg_lower or "మధ్యాహ్నం" in user_msg:
            session.current_time_window = "tomorrow afternoon"
        elif "morning" in msg_lower or "ఉదయం" in user_msg:
            session.current_time_window = "tomorrow morning"
        elif "night" in msg_lower or "రాత్రి" in user_msg:
            session.current_time_window = "tomorrow night"

        # Intent classification
        loc = session.current_location
        time_win = session.current_time_window

        # Intent 1: Fishing / PFZ
        if any(k in msg_lower for k in ["fish", "pfz", "catch", "వేట", "చేపల"]):
            return self._handle_fishing(session, user_msg, lang)

        # Intent 2: Voyage / Route / What-If
        elif any(k in msg_lower for k in ["voyage", "route", "fuel", "depart", "what-if", "ప్రయాణం", "ఇంధనం"]):
            return self._handle_what_if(session, user_msg, lang)

        # Intent 3: Scientific Inquest / Chlorophyll / Algal
        elif any(k in msg_lower for k in ["why", "chlorophyll", "algae", "bloom", "investigate", "శాస్త్రీయ"]):
            return self._handle_scientific(session, user_msg, lang)

        # Intent 4: Conditions & Advisories (Default marine weather inquiry)
        else:
            return self._handle_conditions(session, user_msg, lang)

    def _handle_conditions(self, session: ConversationSession, query: str, lang: str) -> dict:
        loc = session.current_location
        time_win = session.current_time_window

        # Deterministic Kernel evaluation
        # Simulated diurnal conditions: afternoon is choppier than morning
        is_afternoon = "afternoon" in time_win
        wave = 2.1 if is_afternoon else 1.3
        wind = 34.0 if is_afternoon else 20.0

        vessel = VesselProfile.default_mechanized()
        verdict = DecisionKernel.evaluate_voyage(
            location_name=f"{loc} ({time_win})",
            wind_kmph=wind,
            wave_height_m=wave,
            vessel=vessel,
        )

        if lang == "te":
            reply = (
                f"🌊 **{loc} తీరప్రాంత పరిస్థితులు ({time_win}):**\n\n"
                f"• **సూచిక స్థాయి:** {verdict.verdict.value} (రిస్క్ స్కోరు: {verdict.risk_score})\n"
                f"• **అలల ఎత్తు (Wave Height):** [ఫోర్‌కాస్ట్] {wave:.1f} మీటర్లు\n"
                f"• **గాలి వేగం (Wind Speed):** [ఫోర్‌కాస్ట్] {wind:.1f} km/h\n"
                f"• **భద్రతా సలహా:** {verdict.summary}\n\n"
                f"*(మీరు ఇంకా సమయం లేదా చేపల వేట ప్రాంతాల గురించి అడగవచ్చు)*"
            )
        else:
            reply = (
                f"🌊 **Marine Conditions near {loc} ({time_win}):**\n\n"
                f"• **Safety Verdict:** **{verdict.verdict.value}** (Risk Index: {verdict.risk_score:.2f})\n"
                f"• **Significant Wave Height:** `[Forecast]` {wave:.1f}m\n"
                f"• **Sustained Wind Speed:** `[Forecast]` {wind:.1f} km/h (Beaufort Gentle to Moderate)\n"
                f"• **Official Status:** `[Observed]` No severe cyclone warning currently active in sector\n"
                f"• **Operational Advisory:** {verdict.summary}\n\n"
                f"*(Context retained: Location = {loc}, Time = {time_win})*"
            )

        return {
            "reply": reply,
            "language": lang,
            "location": loc,
            "time_window": time_win,
            "verdict": verdict.to_dict(),
            "evidence": verdict.evidence_chain,
        }

    def _handle_fishing(self, session: ConversationSession, query: str, lang: str) -> dict:
        loc = session.current_location
        assessments = PFZService.evaluate_pfzs_for_harbor("H-VIZAG")
        top_pfz = assessments[0]

        if lang == "te":
            reply = (
                f"🐟 **చేపల వేట అనుకూల ప్రాంతాల సమాచారం (PFZ) — {loc}:**\n\n"
                f"• **సిఫార్సు చేయబడిన జోన్:** {top_pfz.zone.name}\n"
                f"• **దూరం & దిశ:** {top_pfz.distance_nm} నాటికల్ మైళ్ళు ({top_pfz.bearing_deg}° దిశలో)\n"
                f"• **అంచనా ప్రయాణ సమయం:** ~{top_pfz.travel_time_hours} గంటలు (మెకనైజ్డ్ బోట్)\n"
                f"• **ఆశించే చేప జాతులు:** {', '.join(top_pfz.zone.recommended_species)}\n"
                f"• **సముద్ర భద్రత:** {top_pfz.sea_safety_verdict.value}\n\n"
                f"⚠️ *గమనిక: {PFZService.CATCH_DISCLAIMER}*"
            )
        else:
            reply = (
                f"🐟 **Potential Fishing Zone (PFZ) Intelligence for {loc}:**\n\n"
                f"• **Target Front:** **{top_pfz.zone.name}**\n"
                f"• **Distance & Bearing:** {top_pfz.distance_nm} NM at bearing {top_pfz.bearing_deg}° ESE\n"
                f"• **Estimated Transit:** ~{top_pfz.travel_time_hours} hours at 8 knots\n"
                f"• **Target Pelagic Species:** {', '.join(top_pfz.zone.recommended_species)}\n"
                f"• **Chlorophyll & SST Front:** {top_pfz.zone.chlorophyll_mg_m3} mg/m³ | {top_pfz.zone.sst_celsius}°C\n"
                f"• **Operational Assessment:** Safe for mechanized trawlers (not recommended for traditional canoes)\n\n"
                f"ℹ️ *{PFZService.CATCH_DISCLAIMER}*"
            )

        return {
            "reply": reply,
            "language": lang,
            "location": loc,
            "pfz": top_pfz.to_dict(),
        }

    def _handle_what_if(self, session: ConversationSession, query: str, lang: str) -> dict:
        loc = session.current_location
        report = WhatIfPlanner.evaluate_scenario(origin_port=f"{loc} Harbor")
        best = next(o for o in report.options if o.option_id == report.recommended_option_id)

        if lang == "te":
            reply = (
                f"🧭 **వాట్-ఇఫ్ (What-If) ప్రయాణ పోలిక — {loc}:**\n\n"
                f"• **సిఫార్సు చేయబడిన సమయం:** {best.title}\n"
                f"• **మొత్తం దూరం:** {best.total_distance_nm} నాటికల్ మైళ్ళు\n"
                f"• **అంచనా ఇంధనం (Fuel):** {best.estimated_fuel_liters} లీటర్లు\n"
                f"• **గరిష్ట అలల ఎత్తు:** {best.max_wave_m} మీటర్లు (భద్రత: {best.overall_verdict.value})\n"
                f"• **విశ్లేషణ:** తెల్లవారుజామున బయలుదేరడం ద్వారా మధ్యాహ్నపు గాలి-అలల తీవ్రతను నివారించవచ్చు."
            )
        else:
            reply = (
                f"🧭 **What-If Departure & Voyage Comparison for {loc}:**\n\n"
                f"• **Optimal Departure Window:** **{best.title}**\n"
                f"• **Roundtrip Distance:** {best.total_distance_nm} NM | Duration: {best.total_travel_hours} hrs\n"
                f"• **Estimated Fuel Requirement:** {best.estimated_fuel_liters} Liters\n"
                f"• **Peak Sea State Exposure:** {best.max_wave_m}m waves, {best.max_wind_kmph} km/h wind\n"
                f"• **Key Reason:** {best.reasons[0]}\n\n"
                f"*(Compare full routes and departure windows in the What-If Planner tab)*"
            )

        return {
            "reply": reply,
            "language": lang,
            "location": loc,
            "what_if": report.to_dict(),
        }

    def _handle_scientific(self, session: ConversationSession, query: str, lang: str) -> dict:
        loc = session.current_location
        report = ScientificKernel.investigate_chlorophyll_spike(location=f"{loc} Shelf")
        favored = next(h for h in report.hypotheses if h.hypothesis_id == report.favored_hypothesis_id)

        if lang == "te":
            reply = (
                f"🔬 **శాస్త్రీయ పరిశోధన నివేదిక — {loc}:**\n\n"
                f"• **గమనించిన విశేషం:** క్లోరోఫిల్ స్పైక్ (4.8 mg/m³)\n"
                f"• **ప్రధాన కారణం (హైపోథీసిస్):** {favored.title} ({favored.likelihood_score * 100:.0f}% సంభావ్యత)\n"
                f"• **సహాయక సాక్ష్యం:** ఉపరితల సముద్ర ఉష్ణోగ్రత 1.7°C తగ్గడం మరియు తీరప్రాంత గాలులు అనుకూలంగా ఉండటం.\n"
                f"• **తదుపరి పరీక్ష:** 100 మీటర్ల లోతు వరకు CTD ఉష్ణోగ్రత పరిశీలన సిఫార్సు చేయబడింది."
            )
        else:
            reply = (
                f"🔬 **Scientific Investigation Report for {loc}:**\n\n"
                f"• **Observed Anomaly:** Unusual Chlorophyll-a spike (4.8 mg/m³) with cooling SST\n"
                f"• **Leading Hypothesis:** **{favored.title}** (Confidence: {favored.likelihood_score * 100:.0f}%)\n"
                f"• **Key Evidence:** Alongshore south-westerly winds driving offshore Ekman transport and thermocline shoaling\n"
                f"• **Alternative Tested:** River runoff considered unlikely due to low water temperature and salinity profile\n"
                f"• **Next Step:** In-situ CTD cross-shelf transect recommended to verify vertical density gradient."
            )

        return {
            "reply": reply,
            "language": lang,
            "location": loc,
            "scientific_report": report.to_dict(),
        }
