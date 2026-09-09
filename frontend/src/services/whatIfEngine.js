// frontend/src/services/whatIfEngine.js
// What-If Voyage, Route, Departure Window, and Fuel Comparison Engine

import { VESSEL_PROFILES } from './decisionKernel';

export function calculateFuelEstimate({
  distanceNm,
  cruiseSpeedKnots,
  baseFuelLph,
  avgWaveM,
  avgWindKmph,
}) {
  const hours = distanceNm / Math.max(cruiseSpeedKnots, 1.0);
  const baseLiters = hours * baseFuelLph;
  const waveFactor = 1.0 + Math.max(0, avgWaveM - 1.0) * 0.18;
  const windFactor = 1.0 + (avgWindKmph > 35 ? 0.12 : avgWindKmph > 22 ? 0.05 : 0.0);
  return Number((baseLiters * waveFactor * windFactor).toFixed(1));
}

export function generateWhatIfScenarios({
  originPort = 'Visakhapatnam Harbor',
  destination = 'Outer Shelf PFZ (42 NM offshore)',
  distanceNm = 42.0,
  activityHours = 4.0,
  vesselType = 'MECHANIZED_TRAWLER',
  baseDepartureHour = 8, // 08:00
}) {
  const vessel = VESSEL_PROFILES[vesselType] || VESSEL_PROFILES.MECHANIZED_TRAWLER;
  const transitHours = distanceNm / vessel.cruiseSpeedKnots;
  const totalTripHours = Number((transitHours * 2 + activityHours).toFixed(1));
  const roundtripDist = distanceNm * 2;

  // 1. Early Dawn Calm (-4 hrs from base, e.g. 04:00 AM)
  const optEarly = buildOption({
    id: 'opt-early',
    title: 'Early Dawn Window (-4 hrs) · Optimal',
    depTimeStr: `${String((baseDepartureHour - 4 + 24) % 24).padStart(2, '0')}:00 IST`,
    route: 'Direct Rhumb Line (Dawn Calm)',
    distNm: roundtripDist,
    hours: totalTripHours,
    vessel,
    waveProfile: [0.9, 1.2, 1.3, 1.1],
    windProfile: [14, 18, 22, 18],
    isRecommended: true,
  });

  // 2. Scheduled Departure (Base, e.g. 08:00 AM - runs into afternoon thermal sea breeze)
  const optScheduled = buildOption({
    id: 'opt-scheduled',
    title: 'Scheduled Base Window',
    depTimeStr: `${String(baseDepartureHour).padStart(2, '0')}:00 IST`,
    route: 'Direct Rhumb Line (Afternoon Chop)',
    distNm: roundtripDist,
    hours: totalTripHours,
    vessel,
    waveProfile: [1.4, 2.0, 2.3, 1.9],
    windProfile: [22, 32, 38, 28],
    isRecommended: false,
  });

  // 3. Evening Window (+6 hrs from base, e.g. 14:00)
  const optLate = buildOption({
    id: 'opt-late',
    title: 'Post-Breeze Window (+6 hrs)',
    depTimeStr: `${String((baseDepartureHour + 6) % 24).padStart(2, '0')}:00 IST`,
    route: 'Direct Rhumb Line (Night Passage)',
    distNm: roundtripDist,
    hours: totalTripHours,
    vessel,
    waveProfile: [1.8, 1.9, 1.7, 1.5],
    windProfile: [28, 30, 26, 20],
    isRecommended: false,
  });

  // 4. Inshore Sheltered Arc (+10 NM longer, but behind cape headlands)
  const shelteredDist = roundtripDist + 16.0;
  const shelteredTransit = (distanceNm + 8.0) / vessel.cruiseSpeedKnots;
  const shelteredTotalHours = Number((shelteredTransit * 2 + activityHours).toFixed(1));
  const optSheltered = buildOption({
    id: 'opt-sheltered',
    title: 'Inshore Sheltered Arc (Headland Cover)',
    depTimeStr: `${String(baseDepartureHour).padStart(2, '0')}:00 IST`,
    route: 'Inshore Coastal Arc (+8 NM)',
    distNm: shelteredDist,
    hours: shelteredTotalHours,
    vessel,
    waveProfile: [1.0, 1.2, 1.3, 1.1],
    windProfile: [16, 20, 22, 18],
    isRecommended: false,
  });

  const options = [optEarly, optScheduled, optLate, optSheltered];

  const fuelSaved = Number((optScheduled.fuelLiters - optEarly.fuelLiters).toFixed(1));
  const waveDiff = Number((optScheduled.maxWaveM - optEarly.maxWaveM).toFixed(1));

  const summary = `Departing at ${optEarly.depTimeStr} saves ~${fuelSaved} Liters of diesel and reduces peak wave exposure by ${waveDiff}m compared to the scheduled ${optScheduled.depTimeStr} window by avoiding afternoon onshore wind seas.`;

  return {
    originPort,
    destination,
    vessel,
    options,
    recommendedId: 'opt-early',
    summary,
  };
}

function buildOption({
  id,
  title,
  depTimeStr,
  route,
  distNm,
  hours,
  vessel,
  waveProfile,
  windProfile,
  isRecommended,
}) {
  const avgWave = waveProfile.reduce((a, b) => a + b, 0) / waveProfile.length;
  const avgWind = windProfile.reduce((a, b) => a + b, 0) / windProfile.length;
  const maxWave = Math.max(...waveProfile);
  const maxWind = Math.max(...windProfile);

  const fuelLiters = calculateFuelEstimate({
    distanceNm: distNm,
    cruiseSpeedKnots: vessel.cruiseSpeedKnots,
    baseFuelLph: vessel.baseFuelLph,
    avgWaveM: avgWave,
    avgWindKmph: avgWind,
  });

  let verdict = 'SAFE';
  let riskScore = 0.18;
  const reasons = [];

  if (maxWave > vessel.maxWaveM) {
    verdict = 'PROHIBITED';
    riskScore = 0.88;
    reasons.push(`Peak waves (${maxWave.toFixed(1)}m) exceed ${vessel.name} cap (${vessel.maxWaveM.toFixed(1)}m).`);
  } else if (maxWave >= vessel.maxWaveM * 0.75) {
    verdict = 'CAUTION';
    riskScore = 0.52;
    reasons.push(`Moderate swell (${maxWave.toFixed(1)}m) induces vessel rolling during deck operations.`);
  } else {
    verdict = 'SAFE';
    riskScore = 0.16;
    reasons.push(`Smooth sea state (max wave ${maxWave.toFixed(1)}m, wind ${maxWind.toFixed(0)} km/h).`);
  }

  reasons.push(`Total fuel estimate: ${fuelLiters} Liters`);
  reasons.push(`Roundtrip duration: ${hours} hours`);

  const legs = [
    {
      name: 'Leg 1: Port Breakwater to Mid-Shelf',
      distNm: Number((distNm * 0.25).toFixed(1)),
      waveM: waveProfile[0],
      windKmph: windProfile[0],
      hazard: waveProfile[0] > 1.8 ? 'MODERATE' : 'LOW',
    },
    {
      name: 'Leg 2: Shelf Break to Destination',
      distNm: Number((distNm * 0.25).toFixed(1)),
      waveM: waveProfile[1],
      windKmph: windProfile[1],
      hazard: waveProfile[1] > 2.0 ? 'MODERATE' : 'LOW',
    },
    {
      name: 'Leg 3: On-Station Activity Window',
      distNm: 0,
      waveM: waveProfile[2],
      windKmph: windProfile[2],
      hazard: waveProfile[2] > 2.2 ? 'SEVERE' : waveProfile[2] > 1.6 ? 'MODERATE' : 'LOW',
    },
    {
      name: 'Leg 4: Return Passage to Harbor',
      distNm: Number((distNm * 0.5).toFixed(1)),
      waveM: waveProfile[3],
      windKmph: windProfile[3],
      hazard: waveProfile[3] > 1.8 ? 'MODERATE' : 'LOW',
    },
  ];

  return {
    id,
    title,
    depTimeStr,
    route,
    distNm,
    hours,
    fuelLiters,
    maxWaveM: Number(maxWave.toFixed(1)),
    maxWindKmph: Number(maxWind.toFixed(0)),
    verdict,
    riskScore,
    isRecommended,
    reasons,
    legs,
  };
}
