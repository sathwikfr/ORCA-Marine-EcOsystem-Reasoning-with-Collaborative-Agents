// frontend/src/pages/AnalyticsPage.jsx
// Historical disaster replay + coral reef stress + agent explainability

import { useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts';

// ── Historical cyclone tracks (IMD data, simplified) ─────────────────────────
const CYCLONES = {
  'Cyclone Fani (2019)': {
    color: '#ef4444',
    track: [
      [5.2, 87.5, 'Cat 1', '26 Apr'], [7.1, 86.2, 'Cat 1', '27 Apr'],
      [9.3, 85.5, 'Cat 2', '28 Apr'], [11.2, 84.8, 'Cat 3', '29 Apr'],
      [13.4, 84.1, 'Cat 4', '30 Apr'], [15.2, 83.6, 'Cat 5', '01 May'],
      [17.8, 83.2, 'Cat 5', '02 May'], [19.9, 83.1, 'Cat 4', '03 May'],
      [20.2, 85.9, 'Landfall', '03 May'], [22.0, 87.5, 'Cat 1', '04 May'],
    ],
  },
  'Cyclone Ockhi (2017)': {
    color: '#f97316',
    track: [
      [5.8, 79.5, 'Depression', '29 Nov'], [7.2, 77.8, 'Cyclone', '30 Nov'],
      [9.0, 76.0, 'Severe', '01 Dec'], [11.5, 74.1, 'VSCS', '02 Dec'],
      [14.2, 72.5, 'VSCS', '03 Dec'], [16.8, 70.9, 'Severe', '04 Dec'],
      [19.1, 69.5, 'Cyclone', '05 Dec'],
    ],
  },
  'Cyclone Amphan (2020)': {
    color: '#7c3aed',
    track: [
      [10.1, 84.3, 'Depression', '16 May'], [12.6, 84.1, 'Cyclone', '17 May'],
      [14.9, 85.2, 'ESCS', '18 May'], [16.7, 86.1, 'ESCS', '19 May'],
      [18.2, 86.9, 'ESCS', '19 May'], [21.6, 88.3, 'Landfall', '20 May'],
      [23.5, 88.0, 'Weakening', '20 May'],
    ],
  },
  'Cyclone Biparjoy (2023)': {
    color: '#00d4ff',
    track: [
      [11.5, 65.5, 'Depression', '06 Jun'], [13.2, 64.8, 'CS', '08 Jun'],
      [15.6, 63.9, 'SCS', '10 Jun'], [17.1, 63.0, 'VSCS', '12 Jun'],
      [19.2, 63.5, 'ESCS', '13 Jun'], [22.1, 67.8, 'VSCS', '15 Jun'],
      [23.0, 68.9, 'Landfall', '15 Jun'],
    ],
  },
};

// ── Coral reef locations (known Indian Ocean reefs) ────────────────────────
const REEFS = [
  { name: 'Lakshadweep Islands',    lat: 10.5, lon: 72.7, dhw: 6.2, sst: 30.8, risk: 'HIGH' },
  { name: 'Gulf of Mannar',         lat:  9.1, lon: 79.2, dhw: 3.8, sst: 29.6, risk: 'WATCH' },
  { name: 'Andaman Reefs',          lat: 11.9, lon: 92.8, dhw: 1.2, sst: 28.8, risk: 'LOW'   },
  { name: 'Palk Bay',               lat:  9.8, lon: 79.7, dhw: 2.1, sst: 29.1, risk: 'LOW'   },
  { name: 'Nicobar Islands',        lat:  7.9, lon: 93.2, dhw: 0.8, sst: 28.5, risk: 'LOW'   },
];

const REEF_COLOR = { HIGH: '#ef4444', WATCH: '#f97316', LOW: '#22c55e' };

// ── Agent decision rules (from DisasterReasoningAgent) ────────────────────
const RULES_DEMO = [
  { rule: 'CY-01 Wind ≥ 89 km/h',          triggered: false, weight: 35, confidence: 92, type: 'CYCLONE' },
  { rule: 'CY-02 Pressure < 990 hPa',       triggered: false, weight: 30, confidence: 88, type: 'CYCLONE' },
  { rule: 'CY-03 SST ≥ 28°C',              triggered: true,  weight: 20, confidence: 75, type: 'CYCLONE' },
  { rule: 'CY-04 Wave height ≥ 3.5m',      triggered: true,  weight: 15, confidence: 80, type: 'CYCLONE' },
  { rule: 'OS-01 Satellite oil anomaly',    triggered: false, weight: 80, confidence: 85, type: 'OIL'     },
  { rule: 'HA-01 Algal bloom detected',     triggered: false, weight: 50, confidence: 80, type: 'HAB'     },
  { rule: 'HA-02 SST anomaly ≥ 2°C',       triggered: true,  weight: 30, confidence: 70, type: 'HAB'     },
  { rule: 'HA-03 Coral bleaching WATCH',    triggered: true,  weight: 20, confidence: 65, type: 'HAB'     },
];

const AGENT_SCORES = [
  { subject: 'Weather',   score: 72 },
  { subject: 'Ocean',     score: 58 },
  { subject: 'Satellite', score: 40 },
  { subject: 'Vessel',    score: 35 },
  { subject: 'Ecosystem', score: 65 },
];

// ── Fit map bounds to track ───────────────────────────────────────────────
function TrackFitter({ track }) {
  const map = useMap();
  if (track.length > 0) {
    const lats = track.map(([lat]) => lat);
    const lons = track.map(([, lon]) => lon);
    map.fitBounds([[Math.min(...lats) - 2, Math.min(...lons) - 2], [Math.max(...lats) + 2, Math.max(...lons) + 2]], { padding: [20, 20] });
  }
  return null;
}

export function AnalyticsPage() {
  const [selectedCyclone, setSelectedCyclone] = useState('Cyclone Fani (2019)');
  const [activeTab, setActiveTab] = useState('replay');

  const cyclone = CYCLONES[selectedCyclone];

  const tabs = [
    { id: 'replay',  label: '🌀 Historical Replay' },
    { id: 'coral',   label: '🐠 Coral Stress'       },
    { id: 'explain', label: '🧠 AI Explainability'  },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1>Analytics & Insights</h1>
        <p>Historical disaster replay · Coral reef stress · AI decision explainability</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 18px', color: activeTab === t.id ? 'var(--accent-blue)' : 'var(--text-muted)',
            borderBottom: activeTab === t.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
            fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Historical Replay ── */}
      {activeTab === 'replay' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="flex items-center gap-3">
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Select Cyclone:</label>
            <select
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
              }}
              value={selectedCyclone}
              onChange={(e) => setSelectedCyclone(e.target.value)}
            >
              {Object.keys(CYCLONES).map((k) => <option key={k}>{k}</option>)}
            </select>
            <span style={{
              fontSize: '0.75rem', padding: '4px 12px', borderRadius: 20,
              background: `${cyclone.color}20`, border: `1px solid ${cyclone.color}40`,
              color: cyclone.color,
            }}>
              {cyclone.track.length} track points
            </span>
          </div>

          <div className="map-container" style={{ height: 400 }}>
            <MapContainer center={[15, 80]} zoom={5} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" subdomains="abcd" />
              <TrackFitter track={cyclone.track} />
              {/* Track polyline */}
              <Polyline
                positions={cyclone.track.map(([lat, lon]) => [lat, lon])}
                pathOptions={{ color: cyclone.color, weight: 3, dashArray: '8 4', opacity: 0.8 }}
              />
              {/* Track points */}
              {cyclone.track.map(([lat, lon, cat, date], i) => (
                <CircleMarker key={i} center={[lat, lon]}
                  radius={i === cyclone.track.length - 1 ? 10 : cat.includes('Landfall') ? 12 : 6}
                  pathOptions={{
                    color: cyclone.color, fillColor: cyclone.color,
                    fillOpacity: i === cyclone.track.length - 1 ? 0.9 : 0.5,
                    weight: cat.includes('Landfall') ? 3 : 1,
                  }}
                >
                  <Tooltip>
                    <strong>{date}</strong><br />{cat}<br />{lat.toFixed(1)}°N {lon.toFixed(1)}°E
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Track table */}
          <div className="card">
            <h4 style={{ marginBottom: 12 }}>📍 Track Timeline</h4>
            <div style={{ display: 'flex', gap: 0, overflowX: 'auto' }}>
              {cyclone.track.map(([lat, lon, cat, date], i) => (
                <div key={i} style={{
                  minWidth: 110, padding: '10px 14px',
                  borderRight: '1px solid var(--border)',
                  background: cat.includes('Landfall') ? `${cyclone.color}15` : cat.includes('Cat 5') || cat.includes('ESCS') ? 'rgba(239,68,68,0.08)' : 'transparent',
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{date}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 600, color: cyclone.color, marginTop: 2 }}>{cat}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 2 }}>{lat.toFixed(1)}°N</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{lon.toFixed(1)}°E</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Coral Stress ── */}
      {activeTab === 'coral' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' }}>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, color: '#ef4444' }}>Coral Bleaching ALERT — Lakshadweep Islands</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  DHW = 6.2 (NOAA Alert threshold exceeded) · SST = 30.8°C · +2.3°C above climatology
                </div>
              </div>
            </div>
          </div>

          <div className="map-container" style={{ height: 360 }}>
            <MapContainer center={[10, 79]} zoom={5} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" subdomains="abcd" />
              {REEFS.map((reef) => (
                <CircleMarker key={reef.name} center={[reef.lat, reef.lon]}
                  radius={reef.dhw * 3 + 8}
                  pathOptions={{
                    color: REEF_COLOR[reef.risk], fillColor: REEF_COLOR[reef.risk],
                    fillOpacity: 0.25, weight: 2,
                  }}
                >
                  <Tooltip>
                    <strong>{reef.name}</strong><br />
                    SST: {reef.sst}°C<br />
                    DHW: {reef.dhw} weeks<br />
                    Status: {reef.risk}
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          <div className="card">
            <h4 style={{ marginBottom: 16 }}>Degree Heating Weeks by Reef System</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={REEFS} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 10, fill: '#64748b' }} label={{ value: 'DHW', position: 'insideRight', fill: '#64748b', fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <RTooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Bar dataKey="dhw" name="Degree Heating Weeks" radius={[0, 4, 4, 0]}
                  fill="#ef4444"
                  label={{ position: 'right', fill: '#94a3b8', fontSize: 10, formatter: (v) => `${v} DHW` }}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-3 mt-4" style={{ flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#22c55e' }}>● DHW &lt; 4 — Watch</span>
              <span style={{ fontSize: '0.75rem', color: '#f97316' }}>● DHW 4–8 — Alert 1 (bleaching likely)</span>
              <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>● DHW &gt; 8 — Alert 2 (mass mortality)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: AI Explainability ── */}
      {activeTab === 'explain' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="grid-2">
            {/* Radar chart */}
            <div className="card">
              <h4 style={{ marginBottom: 16, color: 'var(--accent-blue)' }}>Agent Risk Contribution</h4>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={AGENT_SCORES}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Radar name="Risk %" dataKey="score" stroke="var(--accent-blue)" fill="var(--accent-blue)" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Risk summary */}
            <div className="card">
              <h4 style={{ marginBottom: 16 }}>Current Assessment</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { type: 'CYCLONE',   prob: 0.35, color: '#f97316' },
                  { type: 'HAB',       prob: 0.22, color: '#7c3aed' },
                  { type: 'OIL SPILL', prob: 0.08, color: '#64748b' },
                ].map((d) => (
                  <div key={d.type}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{d.type}</span>
                      <span style={{ fontSize: '0.8rem', color: d.color }}>{(d.prob * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${d.prob * 100}%`, height: '100%', background: d.color, borderRadius: 4, transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, color: '#eab308', fontSize: '0.85rem' }}>🟡 YELLOW — Advisory</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>Confidence: 76% · Last run: 8 min ago</div>
                </div>
              </div>
            </div>
          </div>

          {/* Rule flags table */}
          <div className="card">
            <h4 style={{ marginBottom: 16 }}>🔍 Rule Firing Trace — Why did ORCA flag this?</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Rule ID', 'Condition', 'Triggered', 'Weight', 'Confidence', 'Disaster Type'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RULES_DEMO.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: r.triggered ? 'rgba(0,212,255,0.03)' : 'transparent' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.72rem' }}>{r.rule.split(' ')[0]}</td>
                    <td style={{ padding: '10px 12px' }}>{r.rule.split(' ').slice(1).join(' ')}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        color: r.triggered ? '#22c55e' : '#64748b',
                        fontWeight: r.triggered ? 700 : 400,
                      }}>
                        {r.triggered ? '✅ YES' : '○ no'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${r.weight}%`, height: '100%', background: 'var(--accent-blue)' }} />
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{r.weight}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{r.confidence}%</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10,
                        background: r.type === 'CYCLONE' ? 'rgba(249,115,22,0.15)' : r.type === 'HAB' ? 'rgba(124,58,237,0.15)' : 'rgba(100,116,139,0.15)',
                        color: r.type === 'CYCLONE' ? '#f97316' : r.type === 'HAB' ? '#a78bfa' : '#94a3b8',
                      }}>
                        {r.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Total cyclone score: 0.35 (CY-03 + CY-04 fired) · HAB score: 0.22 (HA-02 + HA-03 fired) · Alert threshold: 0.65
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
