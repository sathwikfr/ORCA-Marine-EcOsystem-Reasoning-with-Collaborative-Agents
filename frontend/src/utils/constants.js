// frontend/src/utils/constants.js

export const ALERT_LEVELS = {
  GREEN:  { label: 'Normal',   color: '#22c55e', bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.3)'  },
  YELLOW: { label: 'Advisory', color: '#eab308', bg: 'rgba(234,179,8,0.15)',  border: 'rgba(234,179,8,0.3)'  },
  ORANGE: { label: 'Warning',  color: '#f97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' },
  RED:    { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)'  },
};

export const DISASTER_TYPES = {
  CYCLONE:             { label: 'Cyclone',         icon: '🌀' },
  TSUNAMI:             { label: 'Tsunami',         icon: '🌊' },
  OIL_SPILL:           { label: 'Oil Spill',       icon: '🛢️' },
  HARMFUL_ALGAL_BLOOM: { label: 'Algal Bloom',     icon: '🦠' },
  HEATWAVE:            { label: 'Marine Heatwave', icon: '🌡️' },
  FLOODING:            { label: 'Coastal Flooding',icon: '💧' },
  UNKNOWN:             { label: 'Unknown Threat',  icon: '⚠️' },
};

export const AGENT_NAMES = {
  weather_agent:            'Weather Agent',
  ocean_agent:              'Ocean Agent',
  satellite_agent:          'Satellite Agent',
  vessel_agent:             'Vessel Agent',
  ecosystem_agent:          'Ecosystem Agent',
  disaster_reasoning_agent: 'Disaster Reasoning',
  coordinator_agent:        'Coordinator',
};

export const COASTAL_ZONES = [
  { name: 'Arabian Sea North',      center: [21.0, 66.0] },
  { name: 'Arabian Sea Central',    center: [15.0, 73.0] },
  { name: 'Arabian Sea South',      center: [10.0, 76.0] },
  { name: 'Bay of Bengal South',    center: [11.0, 80.0] },
  { name: 'Bay of Bengal Central',  center: [16.0, 82.0] },
  { name: 'Bay of Bengal North',    center: [20.0, 86.0] },
  { name: 'Andaman and Nicobar',    center: [10.0, 93.0] },
  { name: 'Lakshadweep Sea',        center: [10.0, 72.5] },
];

export const INDIA_CENTER = [20.5937, 78.9629];
export const INDIA_ZOOM   = 5;

export const DEMO_ALERTS = [
  {
    alert_id: 'demo-alert-001', alert_level: 'RED', is_active: true,
    alert_type: 'CYCLONE',
    title: '🚨 Red Alert: Deep Depression / Cyclone Arnab Track — North Andhra Pradesh Coast',
    explanation: '🌀 ORCA Multi-Agent Risk Assessment\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nRisk Level: RED · CRITICAL\nDisaster Type: Cyclone / Deep Depression (IMD Track: West-Central Bay of Bengal)\nProbability: 92% | Confidence: 88%\n\n📊 Real-Time Marine Telemetry:\n  • Visakhapatnam Atmospheric Pressure: 987.8 hPa (Severe barometric drop)\n  • Offshore Sustained Wind: 45.3 km/h (Gusts: 61.2 km/h)\n  • Significant Wave Height: 2.68m (Rough Sea State · Beaufort 6-7)\n  • Heading: West-Northwest toward North AP (Visakhapatnam - Kalingapatnam) & South Odisha\n\n⚠️ Official Action Directives:\n  1. Complete suspension of all fishing voyages; port clearances withheld\n  2. Local Cautionary Signal No. 3 hoisted at Visakhapatnam, Kakinada & Kalingapatnam\n  3. Recall all offshore mechanized/motorized craft to harbor immediately\n  4. Alert District EOCs and pre-position NDRF coastal rescue teams',
    recommended_actions: [
      'Prohibit all fishing voyages (Vizag/Kakinada)',
      'Local Cautionary Signal No. 3 active',
      'Recall all offshore craft to harbor',
      'Pre-position NDRF & Coast Guard units',
    ],
    confidence: 0.92,
    source_agents: ['weather_agent', 'ocean_agent', 'vessel_agent', 'coordinator_agent'],
    acknowledged_at: null,
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    alert_id: 'demo-alert-002', alert_level: 'ORANGE', is_active: true,
    alert_type: 'HARMFUL_ALGAL_BLOOM',
    title: 'Harmful Algal Bloom Detected — Kerala Coast',
    explanation: '🦠 HAB Advisory: Harmful algal bloom detected near Kerala coast. Satellite imagery shows 340 km² bloom area. SST anomaly +1.8°C above baseline. Coral bleaching WATCH issued.',
    recommended_actions: ['No-fishing advisory issued', 'Alert FSSAI for seafood monitoring'],
    confidence: 0.74,
    source_agents: ['satellite_agent', 'ecosystem_agent', 'ocean_agent'],
    acknowledged_at: null,
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    alert_id: 'demo-alert-003', alert_level: 'YELLOW', is_active: true,
    alert_type: 'OIL_SPILL',
    title: 'Possible Oil Spill — Arabian Sea North',
    explanation: '🛢️ Satellite observation flagged a potential oil spill signature near Gujarat coast. Sentinel-2 analysis confidence: 68%. Coast Guard visual survey recommended.',
    recommended_actions: ['Coast Guard visual verification', 'Prepare containment equipment'],
    confidence: 0.62,
    source_agents: ['satellite_agent', 'vessel_agent'],
    acknowledged_at: new Date(Date.now() - 5 * 60000).toISOString(),
    created_at: new Date(Date.now() - 90 * 60000).toISOString(),
  },
  {
    alert_id: 'demo-alert-004', alert_level: 'GREEN', is_active: true,
    alert_type: 'UNKNOWN',
    title: 'Andaman Waters — All Systems Normal',
    explanation: '✅ All monitored parameters within normal ranges for Andaman and Nicobar zone. Ecosystem health score: 0.82.',
    recommended_actions: ['Continue regular monitoring'],
    confidence: 0.95,
    source_agents: ['weather_agent', 'ocean_agent', 'ecosystem_agent'],
    acknowledged_at: null,
    created_at: new Date(Date.now() - 3 * 60000).toISOString(),
  },
];

