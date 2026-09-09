// frontend/src/services/decisionKernel.js
// Client-side Deterministic Evidence-Backed Decision Kernel for ORCA

export const VESSEL_PROFILES = {
  MECHANIZED_TRAWLER: {
    id: 'MECHANIZED_TRAWLER',
    name: 'Standard Mechanized Trawler (12-15m)',
    maxWaveM: 2.5,
    maxWindKmph: 45.0,
    cruiseSpeedKnots: 8.0,
    baseFuelLph: 14.0,
  },
  TRADITIONAL_MOTORIZED: {
    id: 'TRADITIONAL_MOTORIZED',
    name: 'Traditional Motorized FRP Boat (8-10m)',
    maxWaveM: 1.6,
    maxWindKmph: 30.0,
    cruiseSpeedKnots: 6.0,
    baseFuelLph: 6.0,
  },
  DEEP_SEA: {
    id: 'DEEP_SEA',
    name: 'Deep Sea Multi-Day Tuna Longliner (>20m)',
    maxWaveM: 4.0,
    maxWindKmph: 65.0,
    cruiseSpeedKnots: 10.5,
    baseFuelLph: 28.0,
  },
};

export function evaluateDecision({
  locationName = 'Visakhapatnam Harbor',
  windKmph = 22.0,
  waveHeightM = 1.3,
  visibilityKm = 10.0,
  vesselType = 'MECHANIZED_TRAWLER',
  hasOfficialWarning = false,
  officialWarningText = '',
}) {
  const vessel = VESSEL_PROFILES[vesselType] || VESSEL_PROFILES.MECHANIZED_TRAWLER;
  const nowStr = new Date().toISOString();

  const observations = [
    {
      param: 'wind_speed',
      label: 'Sustained Wind Speed',
      value: windKmph,
      unit: 'km/h',
      category: 'FORECAST',
      source: 'Open-Meteo High-Res Coastal',
      timestamp: nowStr,
    },
    {
      param: 'wave_height',
      label: 'Significant Wave Height',
      value: waveHeightM,
      unit: 'm',
      category: 'FORECAST',
      source: 'ECMWF Wave Model / Open-Meteo Marine',
      timestamp: nowStr,
    },
    {
      param: 'visibility',
      label: 'Atmospheric Visibility',
      value: visibilityKm,
      unit: 'km',
      category: 'OBSERVED',
      source: 'Coastal Met Observation',
      timestamp: nowStr,
    },
  ];

  if (hasOfficialWarning) {
    observations.push({
      param: 'official_advisory',
      label: 'Official Fishermen Advisory',
      value: officialWarningText || 'Active Coastal Weather Warning',
      unit: '',
      category: 'OFFICIAL_ADVISORY',
      source: 'IMD / INCOIS Joint Bulletin',
      timestamp: nowStr,
    });
  }

  const violations = [];
  const evidence = [];
  const restrictions = [];

  // Wave check
  if (waveHeightM > vessel.maxWaveM) {
    violations.push({
      code: 'DK-WAVE-01',
      param: 'Wave Height',
      observed: waveHeightM,
      threshold: vessel.maxWaveM,
      severity: 'HARD_LIMIT',
      message: `Wave height of ${waveHeightM.toFixed(1)}m exceeds structural safety limit (${vessel.maxWaveM.toFixed(1)}m) for ${vessel.name}.`,
    });
    evidence.push(`Wave ${waveHeightM.toFixed(1)}m > vessel max ${vessel.maxWaveM.toFixed(1)}m`);
  } else if (waveHeightM >= vessel.maxWaveM * 0.8) {
    violations.push({
      code: 'DK-WAVE-02',
      param: 'Wave Height',
      observed: waveHeightM,
      threshold: vessel.maxWaveM * 0.8,
      severity: 'WARNING',
      message: `Wave height (${waveHeightM.toFixed(1)}m) is at ${((waveHeightM / vessel.maxWaveM) * 100).toFixed(0)}% of safe limit. Heavy roll risk.`,
    });
    evidence.push(`Wave approaches safe threshold (${waveHeightM.toFixed(1)}m vs ${vessel.maxWaveM.toFixed(1)}m)`);
  }

  // Wind check
  if (windKmph > vessel.maxWindKmph) {
    violations.push({
      code: 'DK-WIND-01',
      param: 'Wind Speed',
      observed: windKmph,
      threshold: vessel.maxWindKmph,
      severity: 'HARD_LIMIT',
      message: `Wind speed of ${windKmph.toFixed(0)} km/h exceeds vessel structural safety envelope (${vessel.maxWindKmph} km/h).`,
    });
    evidence.push(`Wind ${windKmph.toFixed(0)} km/h > threshold ${vessel.maxWindKmph} km/h`);
  } else if (windKmph >= 38.0) {
    violations.push({
      code: 'DK-WIND-02',
      param: 'Wind Speed',
      observed: windKmph,
      threshold: 38.0,
      severity: 'WARNING',
      message: `Strong Breeze (${windKmph.toFixed(0)} km/h) creates short-period wind sea and difficult maneuvering.`,
    });
  }

  if (hasOfficialWarning) {
    restrictions.push(officialWarningText || 'Official IMD squall warning active');
    evidence.push('Official IMD/INCOIS advisory active');
  }

  const hardLimits = violations.filter((v) => v.severity === 'HARD_LIMIT');
  const warnings = violations.filter((v) => v.severity === 'WARNING');

  let verdict = 'SAFE';
  let riskScore = 0.15;
  let summary = `Conditions near ${locationName} are favorable and well within operational limits for ${vessel.name}.`;

  if (hardLimits.length > 0 || hasOfficialWarning) {
    verdict = 'PROHIBITED';
    riskScore = Math.min(1.0, 0.85 + hardLimits.length * 0.1);
    summary = `Voyage PROHIBITED near ${locationName}. Physical sea conditions exceed safety parameters or official warning is in effect.`;
  } else if (warnings.length > 0) {
    verdict = 'CAUTION';
    riskScore = 0.45 + warnings.length * 0.12;
    summary = `Voyage requires CAUTION near ${locationName}. Moderate sea-state exposure detected; continuous VHF monitoring advised.`;
  }

  return {
    verdict,
    riskScore: Number(riskScore.toFixed(2)),
    summary,
    vessel,
    observations,
    violations,
    restrictions,
    evidence,
    evaluationTimestamp: nowStr,
  };
}
