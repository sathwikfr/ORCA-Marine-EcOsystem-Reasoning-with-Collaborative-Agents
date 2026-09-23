"""
backend/app/api/v1/imd.py
Live IMD Hyderabad weather data scraper & parser.

Scrapes the IMD PHP pages (which embed JS data in HTML), parses the
district-level warnings and station-level nowcast data, and serves
them as clean JSON to the frontend.

Endpoints:
  GET /imd/warnings/nowcast     — station-level nowcast (lat/lon + severity)
  GET /imd/warnings/districts   — district-wise warnings (5 forecast days)
  GET /imd/warnings/subdivisions — subdivision-wise warnings
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Any, Dict, List, Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, Query

logger = logging.getLogger("orca.imd")

router = APIRouter(prefix="/imd", tags=["IMD Weather"])

# ── Constants ─────────────────────────────────────────────────────────────────

IMD_BASE = "https://mausam.imd.gov.in/imd_latest/contents"

ENDPOINTS = {
    "nowcast":      f"{IMD_BASE}/stationwise-nowcast-warning_mc.php?id=1",
    "districts":    f"{IMD_BASE}/districtwise-warning_mc.php?id=1",
    "subdivisions": f"{IMD_BASE}/subdivisionwise-warning_mc.php?id=1",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://mausam.imd.gov.in/hyderabad/",
}

# IMD color → normalized warning level
COLOR_MAP: Dict[str, Dict] = {
    "#008000": {"level": "NO_WARNING", "label": "No Warning", "severity": 0, "badge": "green"},
    "#FFFF00": {"level": "WATCH",      "label": "Watch",      "severity": 1, "badge": "yellow"},
    "#FFA500": {"level": "ALERT",      "label": "Alert",      "severity": 2, "badge": "orange"},
    "#FF0000": {"level": "WARNING",    "label": "Warning",    "severity": 3, "badge": "red"},
}

# Coastal districts relevant to ORCA marine operations
COASTAL_DISTRICTS = {
    # Andhra Pradesh coast
    "SRIKAKULAM", "VIZIANAGARAM", "VISAKHAPATNAM", "ANAKAPALLI",
    "ALLURI SITHARAMA RAJU", "KAKINADA", "KONASEEMA", "EAST GODAVARI",
    "WEST GODAVARI", "KRISHNA", "NTR", "GUNTUR", "BAPATLA",
    "PALNADU", "NELLORE", "KURNOOL",
    # Telangana coastal-adjacent
    "BHADRADRI KOTHAGUDEM", "KHAMMAM", "MAHABUBABAD",
    # Odisha coast
    "GAJAPATI", "GANJAM", "PURI", "JAGATSINGHPUR", "KENDRAPARA", "BHADRAK",
    "BALASORE", "JAJPUR",
    # Tamil Nadu coast
    "CHENNAI", "TIRUVALLUR", "KANCHEEPURAM", "CHENGALPATTU",
    "VILLUPURAM", "CUDDALORE", "NAGAPATTINAM", "TIRUVARUR",
    "THANJAVUR", "RAMANATHAPURAM",
    # Andaman & Nicobar
    "SOUTH ANDAMAN", "NORTH AND MIDDLE ANDAMAN", "NICOBARS",
    # West Bengal
    "PURBA MEDINIPUR", "PASCHIM MEDINIPUR", "SOUTH 24 PARGANAS",
    "NORTH 24 PARGANAS",
}

# ── In-memory TTL cache ────────────────────────────────────────────────────────

_cache: Dict[str, Dict] = {}
CACHE_TTL = 300  # 5 minutes


def _cache_get(key: str) -> Optional[Any]:
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    return None


def _cache_set(key: str, data: Any) -> None:
    _cache[key] = {"data": data, "ts": time.time()}


# ── Scraping helpers ───────────────────────────────────────────────────────────

async def _fetch_html(url: str) -> Optional[str]:
    """Fetch a page's HTML with a 15s timeout."""
    try:
        async with httpx.AsyncClient(
            headers=HEADERS, follow_redirects=True, timeout=15.0
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text
    except Exception as exc:
        logger.warning("IMD fetch failed for %s: %s", url, exc)
        return None


def _extract_areas_from_html(html: str) -> List[Dict]:
    """
    Parse district-warning data from the embedded JS in IMD pages.
    The PHP page injects a JS array like:
        "areas": [{"title":"VISAKHAPATNAM","id":"113","color":"#FFA500","balloonText":"..."}, ...]
    """
    match = re.search(r'"areas"\s*:\s*(\[.*?\])\s*[,}]', html, re.DOTALL)
    if not match:
        return []
    try:
        raw = match.group(1)
        areas = json.loads(raw)
        return areas
    except json.JSONDecodeError:
        return _parse_areas_fallback(html)


def _parse_areas_fallback(html: str) -> List[Dict]:
    """Fallback: regex per-area when JSON fails."""
    results = []
    pattern = re.compile(
        r'\{\s*"title"\s*:\s*"([^"]+)".*?"id"\s*:\s*"([^"]+)".*?"color"\s*:\s*"([^"]+)".*?"balloonText"\s*:\s*"((?:[^"\\]|\\.)*)"',
        re.DOTALL,
    )
    for m in pattern.finditer(html):
        results.append({
            "title": m.group(1),
            "id": m.group(2),
            "color": m.group(3),
            "balloonText": m.group(4),
        })
    return results


def _extract_nowcast_images(html: str) -> List[Dict]:
    """
    Parse station-nowcast data from the 'images' JS array in the nowcast page.
    """
    match = re.search(r'"images"\s*:\s*(\[.*?\])\s*[,}]', html, re.DOTALL)
    if not match:
        return []
    try:
        raw = match.group(1)
        return json.loads(raw)
    except Exception:
        return []


def _parse_balloon_text(balloon: str) -> List[str]:
    """Extract human-readable warning strings from the IMD balloonText HTML."""
    clean = re.sub(r"<[^>]+>", " ", balloon)
    clean = re.sub(r"\\/?(?:p|img|br)", " ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    parts = [p.strip() for p in re.split(r"[;&|]+", clean) if p.strip()]
    parts = [p for p in parts if not p.startswith("Updated on")]
    if parts and ":" in parts[0]:
        parts[0] = parts[0].split(":", 1)[1].strip()
    return [p for p in parts if len(p) > 3]


def _parse_nowcast_description(desc: str) -> Dict:
    """Parse nowcast description HTML into structured fields."""
    clean = re.sub(r"<br\s*/?>|\\/?br", "\n", desc, flags=re.IGNORECASE)
    clean = re.sub(r"<[^>]+>", " ", clean)
    clean = re.sub(r"\s+", " ", clean).strip()

    rain = wind = issued = valid_until = ""
    for line in clean.split("\n"):
        line = line.strip()
        if "rain" in line.lower() or "mm/hr" in line.lower():
            rain = line
        elif "wind" in line.lower() or "kmph" in line.lower():
            wind = line
        elif "Time of issue" in line:
            issued = line
        elif "Valid upto" in line or "Valid up to" in line:
            valid_until = line

    return {
        "rain_intensity": rain,
        "wind_desc": wind,
        "issued_at": issued,
        "valid_until": valid_until,
    }


def _color_to_marker(image_url: str) -> str:
    """Extract color name from nowcast marker filename."""
    for c in ("red", "orange", "yellow", "green"):
        if c in image_url:
            return c
    return "green"


def _normalize_area(area: Dict, day: str = "Day_1") -> Optional[Dict]:
    """Convert raw IMD area dict to clean ORCA format."""
    title = area.get("title", "").strip().upper()
    color = area.get("color", "#008000").upper()
    balloon = area.get("balloonText", "")
    updated_match = re.search(r"Updated on:(\d{4}-\d{2}-\d{2})", balloon)
    updated_on = updated_match.group(1) if updated_match else ""
    level_info = COLOR_MAP.get(color) or COLOR_MAP["#008000"]
    warnings = _parse_balloon_text(balloon)
    if level_info["severity"] == 0:
        warnings = []

    return {
        "district": title,
        "district_id": area.get("id", ""),
        "warning_level": level_info["level"],
        "warning_label": level_info["label"],
        "severity": level_info["severity"],
        "badge": level_info["badge"],
        "color_hex": color,
        "warnings": warnings,
        "updated_on": updated_on,
        "day": day,
        "is_coastal": title in COASTAL_DISTRICTS,
    }


# ── API Endpoints ──────────────────────────────────────────────────────────────

@router.get("/warnings/nowcast")
async def get_nowcast():
    """
    Live station-level nowcast from IMD Hyderabad.
    Refreshed every 5 minutes.
    """
    cache_key = "nowcast"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    html = await _fetch_html(ENDPOINTS["nowcast"])
    if not html:
        stale = _cache.get(cache_key)
        if stale:
            return {**stale["data"], "stale": True}
        return _fallback_nowcast()

    images = _extract_nowcast_images(html)
    level_map = {
        "red":    {"level": "WARNING",    "severity": 3, "label": "Severe Warning"},
        "orange": {"level": "ALERT",      "severity": 2, "label": "Alert"},
        "yellow": {"level": "WATCH",      "severity": 1, "label": "Watch"},
        "green":  {"level": "NO_WARNING", "severity": 0, "label": "No Warning"},
    }

    stations = []
    for img in images:
        marker_color = _color_to_marker(img.get("imageURL", ""))
        desc = _parse_nowcast_description(img.get("description", ""))
        lvl = level_map[marker_color]
        stations.append({
            "station": img.get("title", "").strip(),
            "lat": float(img.get("latitude") or 0),
            "lon": float(img.get("longitude") or 0),
            "marker_color": marker_color,
            "warning_level": lvl["level"],
            "warning_label": lvl["label"],
            "severity": lvl["severity"],
            **desc,
        })

    stations.sort(key=lambda s: s["severity"], reverse=True)

    result = {
        "source": "IMD Hyderabad — Station-wise Nowcast",
        "source_url": ENDPOINTS["nowcast"],
        "station_count": len(stations),
        "stations": stations,
        "last_scraped_ist": _ist_now(),
        "stale": False,
    }
    _cache_set(cache_key, result)
    return result


@router.get("/warnings/districts")
async def get_district_warnings(
    day: str = Query("Day_1", description="Forecast day: Day_1 to Day_5"),
    coastal_only: bool = Query(True, description="Only return coastal/marine districts"),
):
    """
    District-wise weather warnings from IMD Hyderabad.
    Forecast days Day_1 (today) through Day_5.
    Refreshed every 5 minutes per (day, coastal_only) combination.
    """
    if day not in {"Day_1", "Day_2", "Day_3", "Day_4", "Day_5"}:
        day = "Day_1"

    url = f"{ENDPOINTS['districts']}&day={day}"
    cache_key = f"districts:{day}:{'coastal' if coastal_only else 'all'}"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    html = await _fetch_html(url)
    if not html:
        stale = _cache.get(cache_key)
        if stale:
            return {**stale["data"], "stale": True}
        return _fallback_districts(day)

    areas = _extract_areas_from_html(html)
    districts = []
    for area in areas:
        norm = _normalize_area(area, day)
        if norm:
            if coastal_only and not norm["is_coastal"]:
                continue
            districts.append(norm)

    districts.sort(key=lambda d: (-d["severity"], d["district"]))

    summary = {
        "total": len(districts),
        "by_level": {
            "WARNING":    sum(1 for d in districts if d["warning_level"] == "WARNING"),
            "ALERT":      sum(1 for d in districts if d["warning_level"] == "ALERT"),
            "WATCH":      sum(1 for d in districts if d["warning_level"] == "WATCH"),
            "NO_WARNING": sum(1 for d in districts if d["warning_level"] == "NO_WARNING"),
        },
    }

    result = {
        "source": "IMD Hyderabad — District-wise Warnings",
        "source_url": url,
        "day": day,
        "coastal_only": coastal_only,
        "summary": summary,
        "districts": districts,
        "last_scraped_ist": _ist_now(),
        "stale": False,
    }
    _cache_set(cache_key, result)
    return result


@router.get("/warnings/subdivisions")
async def get_subdivision_warnings():
    """
    Subdivision-wise weather warnings from IMD Hyderabad.
    Refreshed every 5 minutes.
    """
    cache_key = "subdivisions"
    cached = _cache_get(cache_key)
    if cached:
        return cached

    html = await _fetch_html(ENDPOINTS["subdivisions"])
    if not html:
        stale = _cache.get(cache_key)
        if stale:
            return {**stale["data"], "stale": True}
        return {"error": "IMD data unavailable", "subdivisions": []}

    areas = _extract_areas_from_html(html)
    subdivisions = [n for a in areas if (n := _normalize_area(a, "Day_1")) is not None]

    result = {
        "source": "IMD Hyderabad — Subdivision-wise Warnings",
        "source_url": ENDPOINTS["subdivisions"],
        "count": len(subdivisions),
        "subdivisions": subdivisions,
        "last_scraped_ist": _ist_now(),
        "stale": False,
    }
    _cache_set(cache_key, result)
    return result


# ── Fallbacks ─────────────────────────────────────────────────────────────────

def _fallback_nowcast() -> Dict:
    return {
        "source": "FALLBACK — IMD unreachable",
        "station_count": 0,
        "stations": [],
        "last_scraped_ist": _ist_now(),
        "stale": True,
        "error": "IMD Hyderabad temporarily unreachable.",
    }


def _fallback_districts(day: str) -> Dict:
    return {
        "source": "FALLBACK — IMD unreachable",
        "day": day,
        "summary": {"total": 0, "by_level": {}},
        "districts": [],
        "last_scraped_ist": _ist_now(),
        "stale": True,
        "error": "IMD Hyderabad temporarily unreachable.",
    }


def _ist_now() -> str:
    from datetime import datetime, timezone, timedelta
    ist = timezone(timedelta(hours=5, minutes=30))
    return datetime.now(ist).strftime("%d %b %Y, %H:%M IST")
