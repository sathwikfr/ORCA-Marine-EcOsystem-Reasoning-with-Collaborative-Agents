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
    title: 'Severe Cyclone Warning — Bay of Bengal Central',
    explanation: '🌀 ORCA Risk Assessment\n━━━━━━━━━━━━━━━━━━━━━━\nRisk Level: RED\nDisaster Type: Cyclone\nProbability: 87% | Confidence: 82%\n\nKey Indicators:\n  • Wind speed 98 km/h — Storm force\n  • Atmospheric pressure 975 hPa — deep depression\n  • SST is +2.4°C above climatology\n\nRecommended:\n  1. All fishing vessels to return to port immediately\n  2. Pre-position NDRF teams at Andhra Pradesh coast\n  3. Activate State Emergency Operation Centres',
    recommended_actions: ['All fishing vessels to return to port', 'Pre-position NDRF teams', 'Activate EOCs'],
    confidence: 0.87,
    source_agents: ['weather_agent', 'ocean_agent', 'vessel_agent'],
    acknowledged_at: null,
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
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

