// frontend/src/pages/MapPage.jsx
import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { INDIA_CENTER, INDIA_ZOOM, COASTAL_ZONES, ALERT_LEVELS } from '../utils/constants';

// Nearest ports for evacuation routing
const PORTS = [
  { name: 'Chennai Port',      lat: 13.08, lon: 80.29, color: '#00d4ff' },
  { name: 'Visakhapatnam',     lat: 17.68, lon: 83.22, color: '#00d4ff' },
  { name: 'Paradip Port',      lat: 20.26, lon: 86.60, color: '#00d4ff' },
  { name: 'Kochi Port',        lat:  9.96, lon: 76.27, color: '#00d4ff' },
  { name: 'Mumbai Port',       lat: 18.93, lon: 72.84, color: '#00d4ff' },
];

// Mock vessel data for prototype demo
const MOCK_VESSELS = Array.from({ length: 30 }, (_, i) => ({
  mmsi: `41900${i}`,
  name: `MV-${String(i).padStart(3, '0')}`,
  lat: 8 + Math.random() * 16,
  lon: 68 + Math.random() * 24,
  type: i % 4 === 0 ? 'CARGO' : 'FISHING',
  in_risk: i < 5,
}));

const MOCK_RISK_ZONE = {
  center: [15.5, 82.0],
  radius: 220,   // km — approximate (Leaflet uses metres)
  level: 'ORANGE',
};

export function MapPage() {
  const [baseLayer, setBaseLayer] = useState('satellite'); // 'satellite', 'dark', 'nasa'
  const [showRoutes, setShowRoutes] = useState(false);
  const [showSatelliteScans, setShowSatelliteScans] = useState(true);

  // Find nearest port for each risk vessel (simplified: pick closest port)
  const riskVessels = MOCK_VESSELS.filter((v) => v.in_risk);
  const evacuationRoutes = riskVessels.map((v) => {
    const nearest = PORTS.reduce((best, p) => {
      const d = Math.hypot(p.lat - v.lat, p.lon - v.lon);
      return d < Math.hypot(best.lat - v.lat, best.lon - v.lon) ? p : best;
    }, PORTS[0]);
    return { vessel: v, port: nearest };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="flex items-center gap-3">
            <h1>Ocean Risk & Satellite Map</h1>
            <span className="badge badge-cyan">ESRI & SENTINEL-2 LIVE</span>
          </div>
          <p style={{ marginTop: 2 }}>High-resolution orbital imagery, vessel tracking, and multi-spectral anomaly detection</p>
        </div>

        <div className="flex gap-2 items-center" style={{ flexWrap: 'wrap' }}>
          {/* Satellite Layer Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border)',
            borderRadius: 8, padding: 2,
          }}>
            <button
              className={`btn ${baseLayer === 'satellite' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '5px 12px', fontSize: '0.74rem', border: 'none' }}
              onClick={() => setBaseLayer('satellite')}
            >
              🛰️ Satellite View
            </button>
            <button
              className={`btn ${baseLayer === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '5px 12px', fontSize: '0.74rem', border: 'none' }}
              onClick={() => setBaseLayer('dark')}
            >
              🌑 Tactical Dark
            </button>
            <button
              className={`btn ${baseLayer === 'nasa' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '5px 12px', fontSize: '0.74rem', border: 'none' }}
              onClick={() => setBaseLayer('nasa')}
            >
              🌍 NASA Earth
            </button>
          </div>

          <button
            className={`btn ${showSatelliteScans ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            onClick={() => setShowSatelliteScans(!showSatelliteScans)}
          >
            🛰️ {showSatelliteScans ? 'Hide' : 'Show'} Sentinel Scans
          </button>

          <button
            className={`btn ${showRoutes ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
            onClick={() => setShowRoutes(!showRoutes)}
          >
            🚢 {showRoutes ? 'Hide' : 'Show'} Evac Routes
          </button>
        </div>
      </div>

      <div className="map-container" style={{ height: 'calc(100vh - 240px)' }}>
        <MapContainer
          center={INDIA_CENTER}
          zoom={INDIA_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          {/* Dynamic Basemap Layer */}
          {baseLayer === 'satellite' && (
            <TileLayer
              key="esri-satellite"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Earthstar Geographics"
              maxZoom={18}
            />
          )}
          {baseLayer === 'dark' && (
            <TileLayer
              key="carto-dark"
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              subdomains="abcd"
            />
          )}
          {baseLayer === 'nasa' && (
            <TileLayer
              key="nasa-gibs"
              url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg"
              attribution="NASA Global Imagery Browse Services (GIBS)"
              maxZoom={9}
            />
          )}

          {/* Risk zone circle */}
          <CircleMarker
            center={MOCK_RISK_ZONE.center}
            radius={80}
            pathOptions={{
              color: ALERT_LEVELS[MOCK_RISK_ZONE.level].color,
              fillColor: ALERT_LEVELS[MOCK_RISK_ZONE.level].color,
              fillOpacity: 0.12,
              weight: 2,
              dashArray: '6 4',
            }}
          >
            <Tooltip permanent direction="top">
              ⚠️ Active Cyclone Warning Zone
            </Tooltip>
          </CircleMarker>

          {/* Sentinel Satellite Observations */}
          {showSatelliteScans && (
            <>
              {/* Sentinel-2 Algal Bloom Footprint near Kerala */}
              <CircleMarker
                center={[9.8, 75.8]}
                radius={45}
                pathOptions={{
                  color: '#10b981',
                  fillColor: '#10b981',
                  fillOpacity: 0.28,
                  weight: 2,
                  dashArray: '4 4',
                }}
              >
                <Tooltip direction="top">
                  🛰️ Sentinel-2 MSI Chlorophyll-a Bloom (340 km²)
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <strong style={{ color: '#10b981' }}>🛰️ Sentinel-2 MSI Observation</strong><br />
                    <span>Type: <strong>Harmful Algal Bloom</strong></span><br />
                    <span>Area: 340 km² · Off Kerala Coast</span><br />
                    <span>Index: NDCI Chlorophyll +0.42</span><br />
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Copernicus MSI Band 4/3/8 Ratio</span>
                  </div>
                </Popup>
              </CircleMarker>

              {/* Sentinel-1 SAR Oil Slick Footprint near Gujarat */}
              <CircleMarker
                center={[21.4, 69.2]}
                radius={32}
                pathOptions={{
                  color: '#f59e0b',
                  fillColor: '#f59e0b',
                  fillOpacity: 0.25,
                  weight: 2,
                  dashArray: '5 5',
                }}
              >
                <Tooltip direction="top">
                  🛰️ Sentinel-1 SAR Radar Oil Slick Anomaly
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <strong style={{ color: '#f59e0b' }}>🛰️ Sentinel-1 SAR Synthetic Radar</strong><br />
                    <span>Anomaly: <strong>Surface Oil Slick</strong></span><br />
                    <span>Backscatter Drop: -5.2 dB</span><br />
                    <span>Length: 18.4 km offshore slick trail</span><br />
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Capillary Wave Damping Analysis</span>
                  </div>
                </Popup>
              </CircleMarker>
            </>
          )}

          {/* Coastal zone markers */}
          {COASTAL_ZONES.map((zone) => (
            <CircleMarker
              key={zone.name}
              center={zone.center}
              radius={4}
              pathOptions={{
                color: 'rgba(0,212,255,0.7)',
                fillColor: 'rgba(0,212,255,0.3)',
                fillOpacity: 1, weight: 1,
              }}
            >
              <Tooltip>{zone.name}</Tooltip>
            </CircleMarker>
          ))}

          {/* Vessel positions */}
          {MOCK_VESSELS.map((vessel) => (
            <CircleMarker
              key={vessel.mmsi}
              center={[vessel.lat, vessel.lon]}
              radius={vessel.in_risk ? 5 : 3}
              pathOptions={{
                color: vessel.in_risk ? '#ef4444' : '#00d4ff',
                fillColor: vessel.in_risk ? '#ef4444' : '#00d4ff',
                fillOpacity: vessel.in_risk ? 0.9 : 0.6,
                weight: 1,
              }}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong>{vessel.name}</strong><br />
                  <span>Type: {vessel.type}</span><br />
                  <span>MMSI: {vessel.mmsi}</span><br />
                  {vessel.in_risk && (
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>
                      ⚠️ IN RISK ZONE
                    </span>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Safe Harbour Ports */}
          {PORTS.map((port) => (
            <CircleMarker
              key={port.name}
              center={[port.lat, port.lon]}
              radius={6}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Tooltip permanent={false} direction="top">
                ⚓ {port.name} (Safe Harbour)
              </Tooltip>
              <Popup>
                <div>
                  <strong>⚓ {port.name}</strong><br />
                  <span style={{ fontSize: '0.8rem', color: '#10b981' }}>Designated Evacuation Port</span><br />
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Coords: {port.lat}°N, {port.lon}°E</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Evacuation Routes */}
          {showRoutes &&
            evacuationRoutes.map(({ vessel, port }) => (
              <Polyline
                key={`route-${vessel.mmsi}`}
                positions={[
                  [vessel.lat, vessel.lon],
                  [port.lat, port.lon],
                ]}
                pathOptions={{
                  color: '#fbbf24',
                  weight: 2.5,
                  dashArray: '6 8',
                  opacity: 0.9,
                }}
              >
                <Tooltip sticky>
                  🚨 Evac Route: {vessel.name} ➔ {port.name}
                </Tooltip>
              </Polyline>
            ))}
        </MapContainer>
      </div>

      {/* Map legend */}
      <div className="card" style={{ padding: '12px 20px' }}>
        <div className="flex gap-4 items-center" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Map Layers:</span>
          <span style={{ fontSize: '0.78rem', color: '#00d4ff' }}>● Vessel (safe)</span>
          <span style={{ fontSize: '0.78rem', color: '#ef4444' }}>● Vessel (in risk zone)</span>
          <span style={{ fontSize: '0.78rem', color: '#10b981' }}>⚓ Safe Harbour Port</span>
          {showRoutes && <span style={{ fontSize: '0.78rem', color: '#fbbf24' }}>- - Evacuation Route</span>}
          {showSatelliteScans && (
            <>
              <span style={{ fontSize: '0.78rem', color: '#10b981' }}>🛰️ Sentinel-2 Algal Bloom Scan</span>
              <span style={{ fontSize: '0.78rem', color: '#f59e0b' }}>🛰️ Sentinel-1 SAR Oil Slick Anomaly</span>
            </>
          )}
          <span style={{ fontSize: '0.78rem', color: '#f97316' }}>○ Active warning area</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Layer: {baseLayer.toUpperCase()} · {MOCK_VESSELS.length} vessels tracked · 2 satellite anomalies
          </span>
        </div>
      </div>
    </div>
  );
}
