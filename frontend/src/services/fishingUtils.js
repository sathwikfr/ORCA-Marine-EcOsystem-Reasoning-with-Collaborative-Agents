// frontend/src/services/fishingUtils.js
// Deterministic hourly fishing-safety evaluator — v2
// Improvements over v1:
//   1. Dual API fetch: Open-Meteo Marine (swell/period/direction) + Forecast (wind direction, pressure)
//   2. Swell height + wave period both evaluated separately (longer period = more dangerous)
//   3. Wind direction classified as OFFSHORE / ONSHORE / PARALLEL relative to each zone's coastline
//   4. Lunar phase computed mathematically (no API needed)
//   5. Fish activity scoring by time-of-day + lunar phase
//   6. Departure window scores SAFE + BIOLOGICALLY OPTIMAL windows separately
//   7. Weighted composite risk score (not binary threshold)

import { VESSEL_PROFILES } from './decisionKernel';

// ── Beaufort classifier ────────────────────────────────────────────────────
const BEAUFORT = [
  [0, 1, 'Calm'], [1, 6, 'Light Air'], [6, 12, 'Light Breeze'],
  [12, 20, 'Gentle Breeze'], [20, 29, 'Moderate Breeze'],
  [29, 39, 'Fresh Breeze'], [39, 50, 'Strong Breeze'],
  [50, 62, 'Near Gale'], [62, 75, 'Gale'],
];
export function beaufortLabel(kmph) {
  for (const [lo, hi, label] of BEAUFORT) if (kmph >= lo && kmph < hi) return label;
  return 'Storm+';
}

// ── Compass direction from degrees ─────────────────────────────────────────
export function compassLabel(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round((deg % 360) / 22.5) % 16];
}

// ── Wind direction classifier relative to coastline ───────────────────────
// For Indian east coast, coast runs roughly N-S (≈ 180°/0°)
// For west coast, coast runs roughly N-S too but wind blows from Arabian Sea (W)
// Simple approach: each PFZ zone has an approximate "safe return bearing" (direction toward coast)
//   OFFSHORE  = wind blowing away from land (dangerous — pushes boats out to sea)
//   ONSHORE   = wind blowing toward land  (moderate — helps return, but can cause surf)
//   PARALLEL  = wind blowing along coast  (generally safe)
export function classifyWindDirection(windDirDeg, zoneShoreBearing) {
  // zoneShoreBearing: approximate compass bearing from zone TOWARD nearest shore
  const diff = Math.abs(((windDirDeg - zoneShoreBearing) + 360) % 360);
  const angle = diff > 180 ? 360 - diff : diff;
  // angle is difference between wind direction and shore direction
  // if wind blows AWAY from shore: angle ~0  (offshore)
  // if wind blows TOWARD shore:    angle ~180 (onshore)
  if (angle <= 45)   return { type: 'OFFSHORE', label: '⚠️ Offshore', color: '#f59e0b', danger: 1.3 };
  if (angle >= 135)  return { type: 'ONSHORE',  label: '🏖️ Onshore',  color: '#6366f1', danger: 1.0 };
  return               { type: 'PARALLEL',  label: '↔️ Parallel',  color: '#22c55e', danger: 0.85 };
}

// ── Lunar Phase Calculator (pure math, no API) ─────────────────────────────
// Based on J.D. Meeus algorithm — accurate to ±1 day
export function getLunarPhase(date = new Date()) {
  const knownNewMoon = new Date('2024-01-11T11:57:00Z'); // known new moon
  const synodicMonth = 29.53058867; // days
  const daysSince = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
  const phase = ((daysSince % synodicMonth) + synodicMonth) % synodicMonth;
  const illumination = (1 - Math.cos((phase / synodicMonth) * 2 * Math.PI)) / 2;

  let name, emoji, fishingBonus;
  if (phase < 1.85 || phase > 27.69) { name = 'New Moon';      emoji = '🌑'; fishingBonus = 1.4; }
  else if (phase < 7.38)             { name = 'Waxing Crescent'; emoji = '🌒'; fishingBonus = 1.1; }
  else if (phase < 9.22)             { name = 'First Quarter';  emoji = '🌓'; fishingBonus = 1.2; }
  else if (phase < 14.77)            { name = 'Waxing Gibbous'; emoji = '🌔'; fishingBonus = 1.15; }
  else if (phase < 16.61)            { name = 'Full Moon';      emoji = '🌕'; fishingBonus = 1.5; }
  else if (phase < 22.15)            { name = 'Waning Gibbous'; emoji = '🌖'; fishingBonus = 1.15; }
  else if (phase < 24.0)             { name = 'Last Quarter';   emoji = '🌗'; fishingBonus = 1.2; }
  else                               { name = 'Waning Crescent'; emoji = '🌘'; fishingBonus = 1.1; }

  return { phase, illumination: +(illumination * 100).toFixed(0), name, emoji, fishingBonus };
}

// ── Fish Activity Score (0–1) by Hour and Lunar Phase ──────────────────────
// Based on solunar theory widely used by Indian fishermen
// Peak feeding: 1h before/after sunrise, sunset, and major solunar periods
export function getFishActivityScore(hour, lunarPhase) {
  // Time-of-day component: dawn peak (0.5h before sunrise ~5:30 IST) and dusk peak (18:00 IST)
  const dawnPeak = 5.5;   // 05:30 IST approximate
  const duskPeak = 17.5;  // 17:30 IST approximate
  const dawnScore = Math.max(0, 1 - Math.abs(hour - dawnPeak) / 2.5);
  const duskScore = Math.max(0, 1 - Math.abs(hour - duskPeak) / 2.0);
  const timeScore = Math.max(dawnScore, duskScore, 0.2); // min base 0.2

  // Lunar bonus scales the time score
  const lunar = lunarPhase?.fishingBonus ?? 1.0;
  const raw = Math.min(1.0, timeScore * (lunar / 1.5));
  return +raw.toFixed(2);
}

export function fishActivityLabel(score) {
  if (score >= 0.75) return { label: 'Peak Feeding',    color: '#4ade80', emoji: '🎣' };
  if (score >= 0.50) return { label: 'Active Feeding',  color: '#a3e635', emoji: '🐠' };
  if (score >= 0.30) return { label: 'Moderate',        color: '#fbbf24', emoji: '🐟' };
  return                    { label: 'Low Activity',    color: '#94a3b8', emoji: '💤' };
}

// ── Monsoon Ban ────────────────────────────────────────────────────────────
// Bay of Bengal: June 1 – July 31 for mechanized trawlers (month 0-indexed: 5=June, 6=July)
// West Coast: April 15 – June 14 (month 3=Apr, 5=June)
// We check which coast the zone is on using longitude
const BOB_BAN  = { startM: 5, startD: 1,  endM: 6, endD: 31 };
const WC_BAN   = { startM: 3, startD: 15, endM: 5, endD: 14 };

function inBan(ban, m, d) {
  const afterStart = m > ban.startM || (m === ban.startM && d >= ban.startD);
  const beforeEnd  = m < ban.endM   || (m === ban.endM   && d <= ban.endD);
  return afterStart && beforeEnd;
}

export function isMonsoonBanActive(vesselType, zoneLon = 82) {
  if (vesselType === 'DEEP_SEA') return false;
  const now = new Date();
  const m = now.getMonth();
  const d = now.getDate();
  const isWestCoast = zoneLon < 76;
  return isWestCoast ? inBan(WC_BAN, m, d) : inBan(BOB_BAN, m, d);
}

export function getMonsoonBanText(vesselType, zoneLon = 82) {
  if (vesselType === 'TRADITIONAL_MOTORIZED')
    return 'Seasonal advisory: Traditional craft — check local fisheries dept bulletin before departure.';
  const isWestCoast = zoneLon < 76;
  return isWestCoast
    ? 'West Coast Monsoon Ban: Mechanized trawling prohibited April 15 – June 14 (Maharashtra/Goa/Kerala) under MFRA.'
    : 'Bay of Bengal Monsoon Ban: Mechanized trawling prohibited June 1 – July 31 (AP/TN/Odisha) under MFRA.';
}

// ── Dual API Fetch — Marine + Atmospheric ─────────────────────────────────
/**
 * Attempts to fetch from the dedicated Open-Meteo Marine API for accurate
 * swell/period/direction data. Falls back to the standard forecast API
 * (which includes combined wave_height) if the marine API returns an error
 * (e.g. HTTP 400 for coordinates with no marine model coverage).
 */
export async function fetchLiveZoneConditions(lat, lon) {
  const base = { latitude: lat, longitude: lon, timezone: 'Asia/Kolkata', forecast_days: 2 };

  // Always fetch atmospheric data — this never fails for valid coordinates.
  const forecastRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
      ...base,
      hourly: [
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'surface_pressure',
        'precipitation_probability',
        'visibility',
        'wave_height',          // fallback wave if marine API fails
      ].join(','),
      current: 'wind_speed_10m,wind_direction_10m,surface_pressure,precipitation,wave_height',
      wind_speed_unit: 'kmh',
    })}`
  );
  if (!forecastRes.ok) throw new Error(`Forecast API HTTP ${forecastRes.status}`);
  const forecast = await forecastRes.json();

  // Try the Marine API for granular swell data — gracefully degrade on failure.
  let marine = null;
  try {
    const marineRes = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?${new URLSearchParams({
        ...base,
        hourly: [
          'wave_height',
          'wave_direction',
          'wave_period',
          'swell_wave_height',
          'swell_wave_period',
          'swell_wave_direction',
          'wind_wave_height',
          'wind_wave_period',
        ].join(','),
        current: 'wave_height,swell_wave_height,wave_period',
      })}`
    );
    if (marineRes.ok) {
      marine = await marineRes.json();
    }
    // If not ok (400/404 = no marine model coverage here) just leave marine=null
  } catch (_) {
    // Network error — carry on with forecast-only
  }

  // Use marine time array if available, else fall back to forecast
  const timeArray = marine?.hourly?.time ?? forecast.hourly?.time ?? [];
  const nowHour   = new Date().getHours();
  const startIdx  = timeArray.findIndex((t) => new Date(t).getHours() === nowHour);
  const from      = startIdx >= 0 ? startIdx : 0;

  const hourly = timeArray.slice(from, from + 24).map((isoTime, i) => {
    const idx = from + i;
    const dt  = new Date(isoTime);
    // Use marine data if available, else fall back to combined wave_height from forecast
    const mh = marine?.hourly;
    const fh = forecast.hourly;
    return {
      isoTime,
      localTime: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }),
      hour: dt.getHours(),
      // Marine wave data — granular if Marine API succeeded, else fallback from forecast
      waveM:         +(mh?.wave_height?.[idx]          ?? fh?.wave_height?.[idx]         ?? 0).toFixed(2),
      waveDir:       +(mh?.wave_direction?.[idx]        ?? 0).toFixed(0),
      wavePeriodSec: +(mh?.wave_period?.[idx]           ?? 8).toFixed(1),   // default 8s period
      swellM:        +(mh?.swell_wave_height?.[idx]     ?? (fh?.wave_height?.[idx] ?? 0) * 0.6).toFixed(2),
      swellPeriodSec:+(mh?.swell_wave_period?.[idx]     ?? 8).toFixed(1),
      swellDir:      +(mh?.swell_wave_direction?.[idx]  ?? 0).toFixed(0),
      windWaveM:     +(mh?.wind_wave_height?.[idx]      ?? (fh?.wave_height?.[idx] ?? 0) * 0.4).toFixed(2),
      windWavePeriod:+(mh?.wind_wave_period?.[idx]      ?? 4).toFixed(1),
      currentKnots:  0, // not available in free tier
      // Atmospheric data — always from forecast API
      windKmph:  +(fh?.wind_speed_10m?.[idx]            ?? 0).toFixed(1),
      windDir:   +(fh?.wind_direction_10m?.[idx]         ?? 0).toFixed(0),
      gustsKmph: +(fh?.wind_gusts_10m?.[idx]             ?? 0).toFixed(1),
      pressure:  +(fh?.surface_pressure?.[idx]           ?? 1013).toFixed(0),
      rainProb:   (fh?.precipitation_probability?.[idx]  ?? 0),
      visKm:     +((fh?.visibility?.[idx]               ?? 10000) / 1000).toFixed(1),
    };
  });

  // Current conditions — merge from whatever sources succeeded
  const mc = marine?.current || {};
  const fc = forecast.current || {};
  const current = {
    waveM:      +(mc.wave_height      ?? fc.wave_height     ?? hourly[0]?.waveM    ?? 0).toFixed(2),
    swellM:     +(mc.swell_wave_height ?? hourly[0]?.swellM ?? 0).toFixed(2),
    wavePeriod: +(mc.wave_period       ?? hourly[0]?.wavePeriodSec ?? 8).toFixed(1),
    windKmph:   +(fc.wind_speed_10m    ?? hourly[0]?.windKmph ?? 0).toFixed(1),
    windDir:    +(fc.wind_direction_10m ?? 0).toFixed(0),
    pressure:   +(fc.surface_pressure  ?? 1013).toFixed(0),
    rain:       +(fc.precipitation     ?? 0).toFixed(1),
    marineDataAvailable: marine !== null,
    fetchedAt: new Date(),
  };

  return { hourly, current };
}


// ── Weighted Composite Risk Score ──────────────────────────────────────────
// More nuanced than v1's simple ratio comparison.
// Swell with long period is MORE dangerous than same-height wind chop.
// Offshore wind amplifies swell danger.
function computeRisk(h, vessel, zoneShoreBearing) {
  const windDir = classifyWindDirection(h.windDir, zoneShoreBearing);

  // Wave hazard: swell is more dangerous than wind chop at same height
  // Long-period swell (>12s) is especially dangerous for small vessels
  const swellDanger = h.swellPeriodSec > 12
    ? h.swellM * 1.4  // long period — amplify effective danger
    : h.swellM * 1.1;
  const effectiveWaveM = Math.max(h.waveM, swellDanger);

  // Wind danger amplified by offshore component
  const effectiveWindKmph = h.windKmph * windDir.danger;

  // Ratios against vessel limits
  const waveRatio = effectiveWaveM  / vessel.maxWaveM;
  const windRatio = effectiveWindKmph / vessel.maxWindKmph;

  // Composite risk [0–1] with weights: wave 50%, wind 35%, pressure 15%
  const pressureFactor = h.pressure < 995  ? 0.3
                       : h.pressure < 1005 ? 0.15
                       : h.pressure < 1010 ? 0.05 : 0;
  const riskScore = Math.min(1, waveRatio * 0.50 + windRatio * 0.35 + pressureFactor);

  // Visibility penalty
  const lowVis = h.visKm < 2;

  return { waveRatio, windRatio, effectiveWaveM, effectiveWindKmph, riskScore, windDir, lowVis };
}

// ── Hourly Slot Evaluator v2 ───────────────────────────────────────────────
export function evaluateHourlySlots(hourlyData, vesselType, zoneLon = 82, zoneShoreBearing = 270) {
  const vessel = VESSEL_PROFILES[vesselType] || VESSEL_PROFILES.MECHANIZED_TRAWLER;
  const lunar  = getLunarPhase();

  return hourlyData.map((h) => {
    // Hard override: monsoon ban
    if (isMonsoonBanActive(vesselType, zoneLon)) {
      return {
        ...h, verdict: 'NO_GO', color: '#ef4444', emoji: '🔴',
        reason: 'Monsoon ban active', riskScore: 1.0, fishActivity: 0,
      };
    }

    const risk = computeRisk(h, vessel, zoneShoreBearing);
    const fishActivity = getFishActivityScore(h.hour, lunar);
    const fishInfo = fishActivityLabel(fishActivity);

    let verdict, color, emoji, reason;

    if (risk.waveRatio >= 1.0 || risk.windRatio >= 1.0 || h.pressure < 992) {
      verdict = 'NO_GO'; color = '#ef4444'; emoji = '🔴';
      if (risk.waveRatio >= 1.0)
        reason = `Wave ${risk.effectiveWaveM.toFixed(1)}m (swell-adj) > limit ${vessel.maxWaveM}m`;
      else if (risk.windRatio >= 1.0)
        reason = `Wind ${risk.effectiveWindKmph.toFixed(0)} km/h (dir-adj) > limit ${vessel.maxWindKmph} km/h`;
      else
        reason = `Extreme low pressure ${h.pressure} hPa — storm risk`;
    } else if (risk.riskScore >= 0.60 || h.pressure < 1005 || h.rainProb >= 70 || risk.lowVis) {
      verdict = 'CAUTION'; color = '#f59e0b'; emoji = '🟡';
      reason = risk.riskScore >= 0.60
        ? `Composite risk ${(risk.riskScore * 100).toFixed(0)}% — ${risk.windDir.label} wind`
        : risk.lowVis
          ? `Poor visibility (${h.visKm} km) — fog/rain risk`
          : `Rain prob ${h.rainProb}% / pressure ${h.pressure} hPa`;
    } else {
      verdict = 'GO'; color = '#22c55e'; emoji = '🟢';
      reason = `Risk ${(risk.riskScore * 100).toFixed(0)}% · Swell ${h.swellM}m · Wind ${h.windKmph} km/h`;
    }

    return {
      ...h, verdict, color, emoji, reason,
      riskScore: risk.riskScore,
      waveRatio: risk.waveRatio,
      windRatio: risk.windRatio,
      windDirInfo: risk.windDir,
      effectiveWaveM: risk.effectiveWaveM,
      fishActivity,
      fishInfo,
    };
  });
}

// ── Best Departure Window Finder v2 ────────────────────────────────────────
// Scores windows by BOTH safety AND biological fishing quality.
// Prefers windows where the vessel arrives ON ZONE during peak feeding times.
export function findBestDepartureWindow(slots, transitHours, activityHours) {
  const totalHoursNeeded = Math.ceil(transitHours * 2 + activityHours);

  let bestSafeWindow      = null; // safest overall
  let bestFishingWindow   = null; // best safety + biological quality
  let bestSafeScore       = -1;
  let bestFishingScore    = -1;

  for (let start = 0; start <= slots.length - totalHoursNeeded; start++) {
    const window = slots.slice(start, start + totalHoursNeeded);
    const hasNoGo = window.some((s) => s.verdict === 'NO_GO');
    if (hasNoGo) continue;

    // Safety score
    const safetyScore = window.reduce((acc, s) =>
      acc + (s.verdict === 'GO' ? 1 : 0.4), 0
    );

    // Biological score: fish activity DURING fishing window (on-zone time)
    const transitSlots  = Math.ceil(transitHours);
    const fishingSlots  = window.slice(transitSlots, transitSlots + Math.ceil(activityHours));
    const fishingScore  = fishingSlots.reduce((acc, s) => acc + (s.fishActivity ?? 0), 0);

    // Early morning bonus (Indian fishermen leave 03:00–05:00 for offshore zones)
    const depHour    = slots[start].hour;
    const earlyBonus = depHour >= 3 && depHour <= 5 ? 2.0
                     : depHour >= 5 && depHour <= 7 ? 1.2 : 0;

    const totalSafeScore    = safetyScore + earlyBonus;
    const totalFishingScore = safetyScore * 0.6 + fishingScore * 0.4 + earlyBonus;

    const returnIdx  = Math.min(start + totalHoursNeeded - 1, slots.length - 1);
    const arrivalIdx = Math.min(start + transitSlots, slots.length - 1);

    const windowData = {
      departureHour: slots[start].hour,
      departureTime: slots[start].localTime,
      returnTime:    slots[returnIdx].localTime,
      arrivalTime:   slots[arrivalIdx].localTime,
      returnSlot:    slots[returnIdx],
      arrivalSlot:   slots[arrivalIdx],
      windowSlots:   window,
      fishingSlots,
      goCount:       window.filter((s) => s.verdict === 'GO').length,
      cautionCount:  window.filter((s) => s.verdict === 'CAUTION').length,
      durationHours: totalHoursNeeded,
      avgFishActivity: fishingScore / Math.max(fishingSlots.length, 1),
    };

    if (totalSafeScore > bestSafeScore) {
      bestSafeScore   = totalSafeScore;
      bestSafeWindow  = windowData;
    }
    if (totalFishingScore > bestFishingScore) {
      bestFishingScore  = totalFishingScore;
      bestFishingWindow = windowData;
    }
  }

  // Fallback
  if (!bestSafeWindow) {
    const firstGo = slots.findIndex((s) => s.verdict === 'GO');
    if (firstGo >= 0) {
      bestSafeWindow = {
        departureHour: slots[firstGo].hour,
        departureTime: slots[firstGo].localTime,
        returnTime: null, arrivalTime: null, returnSlot: null, arrivalSlot: null,
        windowSlots: [slots[firstGo]], fishingSlots: [],
        goCount: 1, cautionCount: 0, durationHours: 1, avgFishActivity: 0,
        partial: true,
      };
      bestFishingWindow = bestSafeWindow;
    }
  }

  return { safeWindow: bestSafeWindow, fishingWindow: bestFishingWindow };
}

// ── Contiguous GO block length ─────────────────────────────────────────────
export function longestContiguousGoBlock(slots) {
  let max = 0, cur = 0;
  for (const s of slots) {
    if (s.verdict === 'GO') { cur++; max = Math.max(max, cur); }
    else cur = 0;
  }
  return max;
}
