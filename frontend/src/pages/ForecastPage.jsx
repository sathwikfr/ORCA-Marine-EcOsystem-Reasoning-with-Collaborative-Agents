// frontend/src/pages/ForecastPage.jsx
// 24-hour + 7-day forecast with REAL Open-Meteo data + Recharts

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const ZONES = [
  { name: 'Bay of Bengal Central', lat: 16.0, lon: 82.0 },
  { name: 'Arabian Sea Central',   lat: 15.0, lon: 73.0 },
  { name: 'Bay of Bengal South',   lat: 11.0, lon: 80.0 },
  { name: 'Kerala Coast',          lat: 10.0, lon: 76.0 },
  { name: 'Andaman Islands',       lat: 11.7, lon: 92.7 },
  { name: 'Gulf of Mannar',        lat:  9.0, lon: 79.0 },
];

const RISK_COLOR = (score) =>
  score >= 0.7 ? '#ef4444' : score >= 0.4 ? '#f97316' : score >= 0.2 ? '#eab308' : '#22c55e';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,22,40,0.95)', border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

async function fetchForecast(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    hourly: 'temperature_2m,wind_speed_10m,surface_pressure,precipitation_probability,wave_height',
    daily:  'temperature_2m_max,temperature_2m_min,wind_speed_10m_max,precipitation_sum,weather_code',
    timezone: 'Asia/Kolkata',
    forecast_days: 7,
  });
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  const d = await r.json();

  // Build 24-hour hourly data
  const hourly = (d.hourly?.time || []).slice(0, 24).map((t, i) => ({
    time: t.slice(11, 16),
    wind: +(d.hourly.wind_speed_10m?.[i] || 0).toFixed(1),
    temp: +(d.hourly.temperature_2m?.[i] || 0).toFixed(1),
    pressure: +(d.hourly.surface_pressure?.[i] || 1013).toFixed(0),
    rain_prob: d.hourly.precipitation_probability?.[i] || 0,
    risk: +Math.min(
      (d.hourly.wind_speed_10m?.[i] || 0) / 120 * 0.5 +
      Math.max(0, (1013 - (d.hourly.surface_pressure?.[i] || 1013)) / 63) * 0.5,
      1
    ).toFixed(2),
  }));

  // Build 7-day daily data
  const daily = (d.daily?.time || []).map((t, i) => ({
    day: new Date(t).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
    max_temp: d.daily.temperature_2m_max?.[i],
    min_temp: d.daily.temperature_2m_min?.[i],
    max_wind: d.daily.wind_speed_10m_max?.[i],
    rain_mm:  d.daily.precipitation_sum?.[i],
  }));

  return { hourly, daily };
}

export function ForecastPage() {
  const [zone, setZone] = useState(ZONES[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetchForecast(zone.lat, zone.lon)
      .then(setData)
      .catch(() => setError('Could not fetch forecast data.'))
      .finally(() => setLoading(false));
  }, [zone.name]);

  const maxRisk = data ? Math.max(...data.hourly.map((h) => h.risk)) : 0;
  const riskColor = RISK_COLOR(maxRisk);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1>24-Hour Forecast</h1>
          <p>Real-time marine weather forecasts · Open-Meteo API</p>
        </div>
        {/* Zone selector */}
        <select
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', borderRadius: 8,
            padding: '8px 14px', fontSize: '0.875rem', cursor: 'pointer',
          }}
          value={zone.name}
          onChange={(e) => setZone(ZONES.find((z) => z.name === e.target.value))}
        >
          {ZONES.map((z) => (
            <option key={z.name} value={z.name}>{z.name}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <div className="spinner" style={{ margin: '0 auto 12px', width: 32, height: 32 }} />
          <p>Fetching live forecast from Open-Meteo…</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ color: 'var(--alert-red)', textAlign: 'center', padding: 40 }}>
          ❌ {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Risk alert bar */}
          <div style={{
            background: `rgba(${riskColor === '#ef4444' ? '239,68,68' : riskColor === '#f97316' ? '249,115,22' : riskColor === '#eab308' ? '234,179,8' : '34,197,94'},0.1)`,
            border: `1px solid ${riskColor}40`,
            borderRadius: 12, padding: '14px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: '1.5rem' }}>
              {maxRisk >= 0.7 ? '🔴' : maxRisk >= 0.4 ? '🟠' : maxRisk >= 0.2 ? '🟡' : '🟢'}
            </span>
            <div>
              <div style={{ fontWeight: 700, color: riskColor }}>
                {maxRisk >= 0.7 ? 'HIGH RISK' : maxRisk >= 0.4 ? 'MODERATE RISK' : maxRisk >= 0.2 ? 'ADVISORY' : 'ALL CLEAR'} — Next 24 Hours
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {zone.name} · Max ORCA risk score: {(maxRisk * 100).toFixed(0)}% · Data as of {new Date().toLocaleTimeString('en-IN')} IST
              </div>
            </div>
          </div>

          {/* Wind Chart */}
          <div className="card">
            <h3 style={{ marginBottom: 16, color: 'var(--accent-blue)' }}>
              💨 Wind Speed (km/h) — Next 24 Hours
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.hourly}>
                <defs>
                  <linearGradient id="windGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="wind" name="Wind (km/h)"
                  stroke="#00d4ff" fill="url(#windGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid-2">
            {/* Pressure Chart */}
            <div className="card">
              <h3 style={{ marginBottom: 16, color: 'var(--accent-teal)' }}>
                🔵 Pressure (hPa)
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval={5} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  {/* Danger line at 1000 hPa */}
                  <Line type="monotone" dataKey="pressure" name="Pressure (hPa)"
                    stroke="#00e5c8" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Rain probability */}
            <div className="card">
              <h3 style={{ marginBottom: 16, color: '#7c3aed' }}>
                🌧️ Rain Probability (%)
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval={5} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rain_prob" name="Rain Probability (%)" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ORCA Risk Score Timeline */}
          <div className="card">
            <h3 style={{ marginBottom: 4 }}>📊 ORCA Composite Risk Score — Next 24 Hours</h3>
            <p style={{ fontSize: '0.78rem', marginBottom: 16 }}>
              Combined wind + pressure model. Above 0.65 triggers automated alert dispatch.
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data.hourly}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={riskColor} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} interval={3} />
                <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} formatter={(v) => `${(v * 100).toFixed(0)}%`} />
                <Area type="monotone" dataKey="risk" name="ORCA Risk Score"
                  stroke={riskColor} fill="url(#riskGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 7-day outlook table */}
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>📅 7-Day Marine Outlook</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Day', 'Max Temp', 'Min Temp', 'Max Wind', 'Rainfall'].map((h) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.day}</td>
                      <td style={{ padding: '10px 12px', color: '#ef4444' }}>{row.max_temp?.toFixed(1)}°C</td>
                      <td style={{ padding: '10px 12px', color: '#00d4ff' }}>{row.min_temp?.toFixed(1)}°C</td>
                      <td style={{ padding: '10px 12px', color: (row.max_wind || 0) >= 50 ? '#ef4444' : (row.max_wind || 0) >= 30 ? '#f97316' : 'var(--text-primary)' }}>
                        {row.max_wind?.toFixed(1)} km/h
                      </td>
                      <td style={{ padding: '10px 12px', color: (row.rain_mm || 0) > 5 ? '#7c3aed' : 'var(--text-secondary)' }}>
                        {row.rain_mm?.toFixed(1)} mm
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
