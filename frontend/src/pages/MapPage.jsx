// frontend/src/pages/MapPage.jsx
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { INDIA_CENTER, INDIA_ZOOM } from '../utils/constants';

// ── Realistic Monitored Vessels in Actual Coastal Locations ──────────────────
const MONITORED_VESSELS = [
  // ── IN DANGER ZONE: North AP Cyclone Corridor ─────────────────────────────
  {
    mmsi: '41900101',
    name: 'FV Matsya Raj',
    type: 'FISHING',
    subtype: 'Mechanized Trawler (14m)',
    lat: 17.52,
    lon: 84.05,
    speedKnots: 6.2,
    heading: '285° (WNW)',
    in_risk: true,
    riskReason: 'Wave height 2.68m exceeds 2.50m limit · Squalls 61 km/h',
    nearestPort: 'Visakhapatnam Harbor',
    distToPortNm: 28.4,
    statusText: 'CRITICAL HAZARD',
  },
  {
    mmsi: '41900102',
    name: 'FV Sagar Shakti',
    type: 'FISHING',
    subtype: 'Motorized Gillnetter (11.5m)',
    lat: 17.75,
    lon: 83.92,
    speedKnots: 5.1,
    heading: '260° (W)',
    in_risk: true,
    riskReason: 'Severe capsizing risk in 2.7m sea · Signal No. 3 active',
    nearestPort: 'Visakhapatnam Harbor',
    distToPortNm: 18.2,
    statusText: 'CRITICAL HAZARD',
  },
  {
    mmsi: '41900103',
    name: 'MV Godavari Feeder',
    type: 'CARGO',
    subtype: 'Coastal Container Feeder (85m)',
    lat: 17.30,
    lon: 84.28,
    speedKnots: 11.4,
    heading: '210° (SSW)',
    in_risk: true,
    riskReason: 'Squall line crossing · Gale advisory active',
    nearestPort: 'Visakhapatnam Harbor',
    distToPortNm: 39.1,
    statusText: 'SQUALL WARNING',
  },
  {
    mmsi: '41900104',
    name: 'FV Kalinga Star',
    type: 'FISHING',
    subtype: 'Mechanized Trawler (13.8m)',
    lat: 18.08,
    lon: 84.40,
    speedKnots: 4.8,
    heading: '245° (WSW)',
    in_risk: true,
    riskReason: 'Near center vortex · Immediate harbor return ordered',
    nearestPort: 'Visakhapatnam Harbor',
    distToPortNm: 44.5,
    statusText: 'CRITICAL HAZARD',
  },
  {
    mmsi: '41900105',
    name: 'FV Andhra Pride',
    type: 'FISHING',
    subtype: 'Traditional Motorized Craft (9.2m)',
    lat: 17.15,
    lon: 83.75,
    speedKnots: 5.5,
    heading: '320° (NW)',
    in_risk: true,
    riskReason: 'Hard Limit DK-WAVE-01 breached for traditional hull',
    nearestPort: 'Visakhapatnam Harbor',
    distToPortNm: 22.0,
    statusText: 'CRITICAL HAZARD',
  },

  // ── SAFE COMMERCIAL SHIPPING LANES ─────────────────────────────────────────
  {
    mmsi: '41900201',
    name: 'MT Swarna Krishna',
    type: 'CARGO',
    subtype: 'Crude Oil Tanker (240m)',
    lat: 19.45,
    lon: 71.80,
    speedKnots: 14.2,
    heading: '175° (S)',
    in_risk: false,
    riskReason: 'Transit in Arabian Sea deep shipping corridor',
    nearestPort: 'Mumbai JNPT Port',
    distToPortNm: 52.0,
    statusText: 'SAFE TRANSIT',
  },
  {
    mmsi: '41900202',
    name: 'MV Chennai Express',
    type: 'CARGO',
    subtype: 'Bulk Carrier (180m)',
    lat: 18.50,
    lon: 72.20,
    speedKnots: 12.8,
    heading: '190° (S)',
    in_risk: false,
    riskReason: 'Normal transit Mumbai approaches',
    nearestPort: 'Mumbai JNPT Port',
    distToPortNm: 36.4,
    statusText: 'SAFE TRANSIT',
  },
  {
    mmsi: '41900203',
    name: 'MT Malabar Spirit',
    type: 'CARGO',
    subtype: 'Chemical Tanker (160m)',
    lat: 10.45,
    lon: 75.30,
    speedKnots: 13.5,
    heading: '155° (SSE)',
    in_risk: false,
    riskReason: 'Kerala offshore sea lane (Normal conditions)',
    nearestPort: 'Kochi Harbor',
    distToPortNm: 42.1,
    statusText: 'SAFE TRANSIT',
  },

  // ── SAFE LOCAL FISHING FLEETS ──────────────────────────────────────────────
  {
    mmsi: '41900301',
    name: 'FV Kasimedu Leader',
    type: 'FISHING',
    subtype: 'Mechanized Trawler (12m)',
    lat: 13.25,
    lon: 80.45,
    speedKnots: 4.5,
    heading: '080° (E)',
    in_risk: false,
    riskReason: 'Operating in Chennai inshore PFZ (Calm 1.2m waves)',
    nearestPort: 'Chennai Port',
    distToPortNm: 12.0,
    statusText: 'SAFE INSHORE',
  },
  {
    mmsi: '41900302',
    name: 'FV Cochin Fisher',
    type: 'FISHING',
    subtype: 'Purse Seiner (15m)',
    lat: 9.85,
    lon: 76.10,
    speedKnots: 5.2,
    heading: '260° (W)',
    in_risk: false,
    riskReason: 'Operating in Kochi coastal grounds (Calm 1.0m waves)',
    nearestPort: 'Kochi Harbor',
    distToPortNm: 14.5,
    statusText: 'SAFE INSHORE',
  },
];

// ── Designated Safe Ports ───────────────────────────────────────────────────
const PORTS = [
  {
    id: 'port-vizag',
    name: 'Visakhapatnam Port',
    state: 'Andhra Pradesh',
    lat: 17.68,
    lon: 83.22,
    status: 'PRIMARY EMERGENCY HAVEN',
    note: 'Signal No. 3 Hoisted · Active Reception Berth for Evacuees',
  },
  {
    id: 'port-chennai',
    name: 'Chennai Kasimedu Port',
    state: 'Tamil Nadu',
    lat: 13.08,
    lon: 80.29,
    status: 'OPEN & OPERATIONAL',
    note: 'Clear Weather · Regular Fleet Operations',
  },
  {
    id: 'port-paradip',
    name: 'Paradip Harbor',
    state: 'Odisha',
    lat: 20.26,
    lon: 86.60,
    status: 'CYCLONE PRE-ALERT',
    note: 'Tracking Northern Depression Track',
  },
  {
    id: 'port-kochi',
    name: 'Kochi Harbor',
    state: 'Kerala',
    lat: 9.96,
    lon: 76.27,
    status: 'OPEN & OPERATIONAL',
    note: 'Normal Inshore Operations',
  },
  {
    id: 'port-mumbai',
    name: 'Mumbai JNPT Port',
    state: 'Maharashtra',
    lat: 18.93,
    lon: 72.84,
    status: 'OPEN & OPERATIONAL',
    note: 'Commercial Hub · Normal Navigational Conditions',
  },
];

// ── Cyclone / Deep Depression System ─────────────────────────────────────────
const CYCLONE_SYSTEM = {
  name: 'Cyclone Arnab / Deep Depression',
  center: [17.5, 84.2],
  coreRadius: 110,
  outerRadius: 250,
  pressure: '987.8 hPa',
  wind: '45-65 km/h (Gusts: 75 km/h)',
  waves: '2.68 meters',
  status: 'RED ALERT · DEPRESSION APPROACHING',
};

// ── Camera Controller for Smooth Transitions ─────────────────────────────────
function CameraFlyController({ targetView }) {
  const map = useMap();
  useEffect(() => {
    if (targetView?.center && targetView?.zoom) {
      map.flyTo(targetView.center, targetView.zoom, { duration: 1.2 });
    }
  }, [targetView, map]);
  return null;
}

// ── Leaflet HTML Icon Builders ──────────────────────────────────────────────
function makeLabelIcon(className, text) {
  return L.divIcon({
    className: 'map-pill-wrapper',
    html: `<div class="map-pill ${className}">${text}</div>`,
    iconSize: [120, 26],
    iconAnchor: [60, 13],
  });
}

const cyclonePillIcon = makeLabelIcon('map-pill-cyclone', '🌀 Cyclone Arnab (987.8 hPa)');
const portPillIcon = (name) => makeLabelIcon('map-pill-port', `⚓ ${name}`);
const dangerPillIcon = (name) => makeLabelIcon('map-pill-danger', `🚨 ${name}`);
const cargoPillIcon = (name) => makeLabelIcon('map-pill-cargo', `🚢 ${name}`);

export function MapPage() {
  // Default to 'dark' for maximum tactical clarity (state borders, names, coastlines crystal clear)
  const [baseLayer, setBaseLayer] = useState('dark');
  const [showRoutes, setShowRoutes] = useState(true);
  const [showSatelliteScans, setShowSatelliteScans] = useState(true);
  const [activeTab, setActiveTab] = useState('DANGER'); // 'DANGER', 'PORTS', 'ALL'
  const [targetView, setTargetView] = useState({ center: [17.6, 83.9], zoom: 8 }); // default focus on AP coast!
  const [selectedEntity, setSelectedEntity] = useState(MONITORED_VESSELS[0]);

  const dangerVessels = MONITORED_VESSELS.filter((v) => v.in_risk);
  const vizagPort = PORTS.find((p) => p.id === 'port-vizag');

  // Jump handlers
  const focusOnAPCyclone = () => {
    setTargetView({ center: [17.5, 83.9], zoom: 8 });
  };

  const focusAllIndia = () => {
    setTargetView({ center: INDIA_CENTER, zoom: 5 });
  };

  const focusOnEntity = (entity) => {
    setSelectedEntity(entity);
    setTargetView({ center: [entity.lat, entity.lon], zoom: 9 });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Top Header & Global Status ──────────────────────────────────────── */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="flex items-center gap-3">
            <h1>Tactical Ocean Map & Coastal Command</h1>
            <span className="badge badge-red pulse">AP CYCLONE CRISIS ACTIVE</span>
          </div>
          <p style={{ marginTop: 2 }}>
            Real-time tracking of endangered fishing craft, designated emergency ports, and automated evacuation routing
          </p>
        </div>

        {/* Quick View Camera Presets */}
        <div className="flex items-center gap-2">
          <button
            className="btn btn-primary"
            style={{
              padding: '7px 16px', fontSize: '0.8rem',
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
              borderColor: '#f87171', boxShadow: '0 0 16px rgba(239, 68, 68, 0.4)',
            }}
            onClick={focusOnAPCyclone}
          >
            🚨 Focus on AP Cyclone Crisis (Vizag)
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '7px 14px', fontSize: '0.8rem' }}
            onClick={focusAllIndia}
          >
            🇮🇳 Full India Overview
          </button>
        </div>
      </div>

      {/* ── Split-Screen Command Center ────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '360px 1fr',
        gap: 18,
        minHeight: '640px',
      }}>
        {/* ── LEFT PANEL: Situation Feed & Craft Directory ─────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Active Storm Crisis Card */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md)', padding: 16,
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.15)',
          }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span className="badge badge-red">CRITICAL EVENT</span>
              <span className="mono" style={{ fontSize: '0.72rem', color: '#f87171' }}>987.8 hPa</span>
            </div>
            <h3 style={{ fontSize: '1.05rem', color: '#ffffff', marginBottom: 4 }}>
              🌀 Cyclone Arnab / Deep Depression
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 10 }}>
              System centered 140km offshore North AP. Heavy squalls (61 km/h) & 2.68m waves. Local Cautionary Signal #3 active.
            </p>
            <div className="flex items-center justify-between" style={{
              background: 'rgba(0, 0, 0, 0.3)', padding: '6px 10px', borderRadius: 6,
              fontSize: '0.74rem', color: '#fca5a5',
            }}>
              <span>Craft At Risk: <strong>5 Vessels</strong></span>
              <span>Directives: <strong>Port Recall Active</strong></span>
            </div>
          </div>

          {/* Directory Tabs */}
          <div className="card" style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div style={{
              display: 'flex', background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 8, padding: 3, marginBottom: 12, border: '1px solid var(--border)',
            }}>
              <button
                className={`btn ${activeTab === 'DANGER' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '5px 8px', fontSize: '0.72rem', border: 'none' }}
                onClick={() => setActiveTab('DANGER')}
              >
                🚨 In Danger ({dangerVessels.length})
              </button>
              <button
                className={`btn ${activeTab === 'PORTS' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '5px 8px', fontSize: '0.72rem', border: 'none' }}
                onClick={() => setActiveTab('PORTS')}
              >
                ⚓ Safe Ports ({PORTS.length})
              </button>
              <button
                className={`btn ${activeTab === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '5px 8px', fontSize: '0.72rem', border: 'none' }}
                onClick={() => setActiveTab('ALL')}
              >
                🌐 All Fleet
              </button>
            </div>

            {/* List Body with scroll */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '340px' }}>
              {activeTab === 'DANGER' && (
                dangerVessels.map((v) => (
                  <div
                    key={v.mmsi}
                    onClick={() => focusOnEntity(v)}
                    style={{
                      background: selectedEntity?.mmsi === v.mmsi ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${selectedEntity?.mmsi === v.mmsi ? '#ef4444' : 'rgba(255, 255, 255, 0.07)'}`,
                      borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <strong style={{ color: '#ffffff', fontSize: '0.84rem' }}>{v.name}</strong>
                      <span style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 700 }}>
                        {v.distToPortNm} NM to Vizag
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      {v.subtype} · Speed: {v.speedKnots} kts ({v.heading})
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#fca5a5' }}>
                      ⚠️ {v.riskReason}
                    </div>
                  </div>
                ))
              )}

              {activeTab === 'PORTS' && (
                PORTS.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => focusOnEntity(p)}
                    style={{
                      background: selectedEntity?.name === p.name ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${selectedEntity?.name === p.name ? '#10b981' : 'rgba(255, 255, 255, 0.07)'}`,
                      borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
                      <strong style={{ color: '#ffffff', fontSize: '0.84rem' }}>⚓ {p.name}</strong>
                      <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>
                        {p.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {p.state} · {p.note}
                    </div>
                  </div>
                ))
              )}

              {activeTab === 'ALL' && (
                MONITORED_VESSELS.map((v) => (
                  <div
                    key={v.mmsi}
                    onClick={() => focusOnEntity(v)}
                    style={{
                      background: selectedEntity?.mmsi === v.mmsi ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${selectedEntity?.mmsi === v.mmsi ? '#38bdf8' : 'rgba(255, 255, 255, 0.07)'}`,
                      borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: 2 }}>
                      <strong style={{ color: '#ffffff', fontSize: '0.82rem' }}>
                        {v.in_risk ? '🚨' : v.type === 'FISHING' ? '🐟' : '🚢'} {v.name}
                      </strong>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700,
                        color: v.in_risk ? '#f87171' : '#38bdf8',
                      }}>
                        {v.statusText}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {v.subtype} · Heading: {v.heading}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* How ORCA Works Mini Explainer */}
            <div style={{
              marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)',
              fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4,
            }}>
              💡 <strong>How ORCA Works:</strong>
              <div style={{ marginTop: 4 }}>
                1. <strong>Satellite/AIS Ingest:</strong> Detects craft inside storm radii.<br />
                2. <strong>Decision Kernel:</strong> Flags wave limit breaches (&gt;2.5m).<br />
                3. <strong>Evacuation Router:</strong> Vectors craft along yellow lines to Vizag Port.
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL: Interactive Map Canvas ─────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Map Toolbar */}
          <div className="flex items-center justify-between" style={{
            background: 'rgba(14, 23, 42, 0.7)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '8px 16px', flexWrap: 'wrap', gap: 8,
          }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Basemap:</span>
              <button
                className={`ai-chip ${baseLayer === 'dark' ? 'active' : ''}`}
                style={baseLayer === 'dark' ? { background: 'rgba(56, 189, 248, 0.2)', borderColor: '#38bdf8', color: '#fff' } : {}}
                onClick={() => setBaseLayer('dark')}
              >
                🌑 Tactical Dark (Recommended)
              </button>
              <button
                className={`ai-chip ${baseLayer === 'satellite' ? 'active' : ''}`}
                style={baseLayer === 'satellite' ? { background: 'rgba(56, 189, 248, 0.2)', borderColor: '#38bdf8', color: '#fff' } : {}}
                onClick={() => setBaseLayer('satellite')}
              >
                🛰️ Esri Satellite
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showRoutes}
                  onChange={(e) => setShowRoutes(e.target.checked)}
                />
                Show Evacuation Trajectories
              </label>
            </div>
          </div>

          {/* Map Container */}
          <div className="map-container" style={{ height: '560px', width: '100%', position: 'relative' }}>
            <MapContainer
              center={targetView.center}
              zoom={targetView.zoom}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <CameraFlyController targetView={targetView} />

              {/* Basemaps */}
              {baseLayer === 'satellite' ? (
                <TileLayer
                  key="esri-sat"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Tiles &copy; Esri &mdash; Earthstar Geographics"
                  maxZoom={18}
                />
              ) : (
                <TileLayer
                  key="carto-dark"
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                  subdomains="abcd"
                />
              )}

              {/* ── 1. Cyclone Warning Zone (Outer Perimeter: 250km) ───────── */}
              <CircleMarker
                center={CYCLONE_SYSTEM.center}
                radius={95}
                pathOptions={{
                  color: '#ef4444',
                  fillColor: '#ef4444',
                  fillOpacity: 0.1,
                  weight: 2,
                  dashArray: '6 4',
                }}
              />

              {/* ── 2. Cyclone Squall Core (Inner Perimeter: 110km) ────────── */}
              <CircleMarker
                center={CYCLONE_SYSTEM.center}
                radius={45}
                pathOptions={{
                  color: '#f87171',
                  fillColor: '#b91c1c',
                  fillOpacity: 0.25,
                  weight: 1.5,
                }}
              />

              {/* ── 3. Cyclone Vortex Pill Marker ──────────────────────────── */}
              <Marker
                position={CYCLONE_SYSTEM.center}
                icon={cyclonePillIcon}
                eventHandlers={{
                  click: () => {
                    setSelectedEntity({
                      name: CYCLONE_SYSTEM.name,
                      type: 'STORM_VORTEX',
                      subtype: 'Tropical Deep Depression (RSMC Track)',
                      lat: CYCLONE_SYSTEM.center[0],
                      lon: CYCLONE_SYSTEM.center[1],
                      speedKnots: '14 km/h WNW',
                      heading: '290° (WNW)',
                      in_risk: true,
                      riskReason: 'Active vortex center (987.8 hPa). Severe gale & sea squalls.',
                      nearestPort: 'Visakhapatnam (140 km WSW)',
                      distToPortNm: 75.6,
                      statusText: 'CRITICAL VORTEX',
                    });
                  },
                }}
              />

              {/* ── 4. Designated Safe Ports ───────────────────────────────── */}
              {PORTS.map((p) => (
                <Marker
                  key={p.id}
                  position={[p.lat, p.lon]}
                  icon={portPillIcon(p.name)}
                  eventHandlers={{
                    click: () => {
                      setSelectedEntity({
                        name: p.name,
                        type: 'PORT',
                        subtype: 'Designated Safe Harbor',
                        lat: p.lat,
                        lon: p.lon,
                        speedKnots: '0.0',
                        heading: 'Berthing Basins',
                        in_risk: false,
                        riskReason: p.note,
                        nearestPort: p.name,
                        distToPortNm: 0,
                        statusText: p.status,
                      });
                    },
                  }}
                />
              ))}

              {/* ── 5. Evacuation Lines from Hazard Craft to Vizag Port ────── */}
              {showRoutes && vizagPort && (
                dangerVessels.map((v) => (
                  <Polyline
                    key={`evac-${v.mmsi}`}
                    positions={[
                      [v.lat, v.lon],
                      [vizagPort.lat, vizagPort.lon],
                    ]}
                    pathOptions={{
                      color: '#fbbf24',
                      weight: 3,
                      dashArray: '6 6',
                      opacity: 0.95,
                    }}
                  >
                    <Tooltip sticky direction="top">
                      🚨 Evacuation Line: {v.name} ➔ Vizag Port ({v.distToPortNm} NM)
                    </Tooltip>
                  </Polyline>
                ))
              )}

              {/* ── 6. Monitored Vessels with Clear Name Badges ────────────── */}
              {MONITORED_VESSELS.map((v) => {
                const icon = v.in_risk
                  ? dangerPillIcon(v.name)
                  : v.type === 'FISHING'
                  ? makeLabelIcon('map-pill-port', `🐟 ${v.name}`)
                  : cargoPillIcon(v.name);

                return (
                  <Marker
                    key={v.mmsi}
                    position={[v.lat, v.lon]}
                    icon={icon}
                    eventHandlers={{
                      click: () => setSelectedEntity(v),
                    }}
                  />
                );
              })}

              {/* ── 7. Sentinel Satellite Anomaly Areas ─────────────────────── */}
              {showSatelliteScans && (
                <>
                  <CircleMarker
                    center={[9.8, 75.8]}
                    radius={38}
                    pathOptions={{
                      color: '#10b981',
                      fillColor: '#10b981',
                      fillOpacity: 0.22,
                      weight: 1.5,
                      dashArray: '4 4',
                    }}
                  >
                    <Tooltip direction="top">
                      🦠 Sentinel-2 MSI Algal Bloom (340 km² · Kerala Coast)
                    </Tooltip>
                  </CircleMarker>

                  <CircleMarker
                    center={[21.4, 69.2]}
                    radius={28}
                    pathOptions={{
                      color: '#f59e0b',
                      fillColor: '#f59e0b',
                      fillOpacity: 0.2,
                      weight: 1.5,
                      dashArray: '5 5',
                    }}
                  >
                    <Tooltip direction="top">
                      🛢️ Sentinel-1 SAR Radar Oil Slick Anomaly (Gujarat Coast)
                    </Tooltip>
                  </CircleMarker>
                </>
              )}
            </MapContainer>
          </div>

          {/* ── Active Entity Inspector HUD ────────────────────────────────── */}
          {selectedEntity && (
            <div style={{
              background: 'rgba(8, 14, 26, 0.95)',
              border: `1px solid ${selectedEntity.in_risk ? 'rgba(239, 68, 68, 0.5)' : 'rgba(56, 189, 248, 0.3)'}`,
              borderRadius: 10, padding: '12px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: 12,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
            }}>
              <div>
                <div className="flex items-center gap-2">
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    color: selectedEntity.in_risk ? '#f87171' : '#38bdf8',
                    background: selectedEntity.in_risk ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                    fontFamily: 'JetBrains Mono',
                  }}>
                    {selectedEntity.statusText}
                  </span>
                  <strong style={{ color: '#ffffff', fontSize: '0.92rem' }}>{selectedEntity.name}</strong>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>({selectedEntity.subtype})</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  📍 Coords: <strong style={{ color: '#f1f5f9' }}>{selectedEntity.lat.toFixed(2)}°N, {selectedEntity.lon.toFixed(2)}°E</strong> ·
                  Speed: <strong style={{ color: '#f1f5f9' }}>{selectedEntity.speedKnots} kts</strong> ·
                  Nearest Harbor: <strong style={{ color: '#10b981' }}>{selectedEntity.nearestPort} ({selectedEntity.distToPortNm} NM)</strong>
                </div>
              </div>

              {selectedEntity.in_risk && (
                <div style={{
                  padding: '6px 14px', borderRadius: 6,
                  background: '#ef4444', color: '#ffffff',
                  fontSize: '0.76rem', fontWeight: 700,
                  boxShadow: '0 0 14px rgba(239, 68, 68, 0.4)',
                }}>
                  🚨 Emergency Evac Order ➔ Guide to Vizag Harbor
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
