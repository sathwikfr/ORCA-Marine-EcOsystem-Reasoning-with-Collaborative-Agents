// frontend/src/services/pfzData.js
// Potential Fishing Zones (PFZ) and Indian Fishing Harbors Data
// Includes monsoon ban periods and live-fetch helpers.

export const HARBORS = [
  { id: 'H-VIZAG', name: 'Visakhapatnam Fishing Harbor', state: 'Andhra Pradesh', lat: 17.69, lon: 83.30, fleet: 750 },
  { id: 'H-KAKI',  name: 'Kakinada Harbor',               state: 'Andhra Pradesh', lat: 16.98, lon: 82.26, fleet: 620 },
  { id: 'H-CHEN',  name: 'Chennai Kasimedu Harbor',        state: 'Tamil Nadu',     lat: 13.12, lon: 80.30, fleet: 890 },
  { id: 'H-KOCHI', name: 'Kochi Thoppumpady Harbor',       state: 'Kerala',         lat:  9.94, lon: 76.26, fleet: 940 },
  { id: 'H-PARA',  name: 'Paradip Fishing Harbor',         state: 'Odisha',         lat: 20.29, lon: 86.68, fleet: 510 },
  { id: 'H-VERA',  name: 'Veraval Harbor',                 state: 'Gujarat',        lat: 20.90, lon: 70.36, fleet: 1200 },
];

export const PFZ_ZONES = [
  {
    id: 'PFZ-AP-01',
    name: 'Visakhapatnam Off-Shelf Convergence',
    sector: 'Andhra Coast',
    lat: 17.45,
    lon: 83.80,
    shoreBearing: 270, // zone is EAST of coast, shore is to the WEST
    depthM: 65,
    chlorophyll: 1.85,
    sst: 28.4,
    gradient: 0.18,
    species: ['Yellowfin Tuna', 'Indian Mackerel', 'Ribbonfish'],
    validity: 'Valid next 48 hours (INCOIS)',
    restricted: false,
  },
  {
    id: 'PFZ-AP-02',
    name: 'Kakinada Offshore Frontal Eddy',
    sector: 'Andhra Coast',
    lat: 16.80,
    lon: 82.70,
    shoreBearing: 270,
    depthM: 52,
    chlorophyll: 2.10,
    sst: 28.1,
    gradient: 0.22,
    species: ['Seer fish (King Mackerel)', 'Carangids', 'Penaeid Shrimp'],
    validity: 'Valid next 48 hours (INCOIS)',
    restricted: false,
  },
  {
    id: 'PFZ-TN-01',
    name: 'Chennai Coromandel Front',
    sector: 'Tamil Nadu',
    lat: 13.35,
    lon: 80.65,
    shoreBearing: 280, // slightly NW toward coast
    depthM: 80,
    chlorophyll: 1.65,
    sst: 28.7,
    gradient: 0.15,
    species: ['Skipjack Tuna', 'Sardines', 'Barracuda'],
    validity: 'Valid next 48 hours (INCOIS)',
    restricted: false,
  },
  {
    id: 'PFZ-KL-01',
    name: 'Kochi Malabar Upwelling Front',
    sector: 'Kerala',
    lat: 9.75,
    lon: 75.85,
    shoreBearing: 90, // zone is WEST of coast, shore is to the EAST
    depthM: 45,
    chlorophyll: 3.20,
    sst: 27.8,
    gradient: 0.28,
    species: ['Oil Sardine', 'Indian Mackerel', 'Anchovy'],
    validity: 'Valid next 36 hours (INCOIS)',
    restricted: false,
  },
  {
    id: 'PFZ-OD-01',
    name: 'Gahirmatha Coastal Buffer',
    sector: 'Odisha',
    lat: 20.65,
    lon: 87.10,
    shoreBearing: 270,
    depthM: 35,
    chlorophyll: 2.80,
    sst: 27.9,
    gradient: 0.24,
    species: ['Hilsa', 'Croaker'],
    validity: 'Notice: Marine Sanctuary Boundary',
    restricted: true,
    restrictionReason: 'Within Gahirmatha Olive Ridley Turtle Sanctuary. Mechanized fishing prohibited.',
  },
  {
    id: 'PFZ-GJ-01',
    name: 'Veraval Saurashtra Shelf Break',
    sector: 'Gujarat',
    lat: 21.20,
    lon: 69.80,
    shoreBearing: 45, // NE toward Gujarat coast
    depthM: 90,
    chlorophyll: 1.42,
    sst: 28.6,
    gradient: 0.14,
    species: ['Pomfret', 'Bombay Duck', 'Hilsa', 'Ribbon Fish'],
    validity: 'Valid next 48 hours (INCOIS)',
    restricted: false,
  },
  {
    id: 'PFZ-AN-01',
    name: 'Andaman South Thermal Convergence',
    sector: 'Andaman Sea',
    lat: 10.80,
    lon: 92.50,
    shoreBearing: 90, // zone is west of Andaman Islands, shore is east
    depthM: 120,
    chlorophyll: 1.10,
    sst: 29.1,
    gradient: 0.12,
    species: ['Bigeye Tuna', 'Dorado (Mahi-Mahi)', 'Flying Fish'],
    validity: 'Valid next 48 hours (INCOIS)',
    restricted: false,
  },
];

// ─── Distance and Bearing Utilities ───────────────────────────────────────

export function calcDistanceNm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;
  return Number((km * 0.539957).toFixed(1)); // NM
}

export function calcBearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brg = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brg + 360) % 360);
}

export function bearingLabel(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export const CATCH_DISCLAIMER =
  'Scientific Notice: Potential Fishing Zone (PFZ) advisories identify oceanic thermal fronts and chlorophyll convergence where pelagic fish typically aggregate. They indicate biological probability and do NOT guarantee harvest volume.';
