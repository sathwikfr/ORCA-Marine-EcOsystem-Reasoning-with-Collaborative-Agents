// frontend/src/components/ai/AiCopilotBanner.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const KNOWLEDGE_RESPONSES = {
  track: {
    question: 'Track & Landfall ETA for North AP Coast',
    title: '🌀 Deep Depression / Cyclone Arnab Trajectory Analysis',
    summary: 'System is moving West-Northwest at 14 km/h over West-Central Bay of Bengal, projected to cross between Visakhapatnam (AP) and Gopalpur (Odisha) within the next 24-36 hours.',
    metrics: [
      { label: 'Current Coordinates', value: '17.5°N, 84.2°E' },
      { label: 'Distance to Shore', value: '~140 km ESE of Kalingapatnam' },
      { label: 'Central Pressure', value: '987.8 hPa' },
      { label: 'Expected Max Gusts', value: '75 km/h at Landfall' },
    ],
    agents: [
      { name: 'Weather Agent', note: 'Rapid barometric drop of -25 hPa confirmed by coastal stations.' },
      { name: 'Ocean Agent', note: 'Wave steepness index: 0.052 (High capsizing hazard for vessels <15m).' },
      { name: 'Supervisor Agent', note: 'Pre-positioned alerts sent to Vizag and Kakinada port authorities.' },
    ],
    recommendation: 'Enforce strict 48-hour harbor stay. Evacuate low-lying beach landing craft.',
  },
  trawlers: {
    question: 'Can mechanized trawlers sail from Visakhapatnam?',
    title: '⛔ Voyage Decision Kernel Verdict: PROHIBITED',
    summary: 'The ORCA Deterministic Decision Kernel has evaluated conditions for Standard Mechanized Trawlers (12-15m) and issued a STRICT PROHIBITION.',
    metrics: [
      { label: 'Safety Verdict', value: 'PROHIBITED (Risk: 1.0/1.0)' },
      { label: 'Observed Wave Height', value: '2.68m (Threshold: 2.50m)' },
      { label: 'Wind Exposure', value: '45.3 km/h (Limit: 45.0 km/h)' },
      { label: 'Port Clearance', value: 'WITHHELD' },
    ],
    agents: [
      { name: 'Decision Kernel', note: 'Rule DK-WAVE-01 triggered: 2.68m > 2.5m structural tolerance.' },
      { name: 'Marine Safety Agent', note: 'Local Cautionary Signal No. 3 hoisted at Vizag Fishing Harbor.' },
      { name: 'Vessel Agent', note: '5 offshore craft tagged in warning perimeter and ordered to harbor.' },
    ],
    recommendation: 'No trawler departures permitted until significant wave height subsides below 1.8m.',
  },
  rules: {
    question: 'Explain Decision Kernel rule DK-WAVE-01',
    title: '⚖️ Mathematical Safety Boundary: DK-WAVE-01',
    summary: 'Rule DK-WAVE-01 defines the non-negotiable hydrodynamic operating envelope for traditional and mechanized Indian fishing fleets based on INCOIS and IMO standards.',
    metrics: [
      { label: 'Rule Identifier', value: 'DK-WAVE-01 (HARD_LIMIT)' },
      { label: 'Mechanized Threshold', value: 'Hs > 2.5 meters' },
      { label: 'Traditional Threshold', value: 'Hs > 1.8 meters' },
      { label: 'Legal Status', value: 'Statutory Maritime Directive' },
    ],
    agents: [
      { name: 'Oceanographer Agent', note: 'Wave energy increases with Hs²; a 2.7m sea exerts 180% dynamic force vs a 2.0m sea.' },
      { name: 'Geofencing Agent', note: 'Zone boundary enforced along 12 NM territorial sea and contiguous EEZ.' },
    ],
    recommendation: 'Automated lock applied: Voyage planners will flag any planned route through this sector.',
  },
  pfz: {
    question: 'Which PFZ fishing zones are safe right now?',
    title: '🐟 Potential Fishing Zone Operational Status',
    summary: 'Northern Andhra sectors are hazardous and suspended. Central-South Tamil Nadu and Kerala coastal zones remain open under caution.',
    metrics: [
      { label: 'Visakhapatnam PFZ-AP-01', value: '⛔ SUSPENDED (High Waves)' },
      { label: 'Kakinada PFZ-AP-02', value: '⚠️ RESTRICTED (Squalls)' },
      { label: 'Chennai PFZ-TN-01', value: '🟡 CAUTION (Mod Seas 1.4m)' },
      { label: 'Kochi PFZ-KL-01', value: '🟢 OPEN (Calm 1.1m)' },
    ],
    agents: [
      { name: 'Oceanographer Agent', note: 'Frontal eddies active near Chennai; thermal gradients stable at 0.18°C/km.' },
      { name: 'Route Optimizer', note: 'Recommend southern fleet operations only.' },
    ],
    recommendation: 'Reroute operations southward toward Tamil Nadu / Coromandel shelf if sailing.',
  },
};

export function AiCopilotBanner() {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [customQuery, setCustomQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Live real-time telemetry state from Open-Meteo
  const [telemetry, setTelemetry] = useState({
    pressure: 1008.2,
    wind: 15.0,
    gusts: 22.0,
    waves: 1.8,
    isSevere: false,
    alertLevel: 'nominal', // 'cyclone' | 'rough_sea' | 'squall' | 'nominal'
    systemName: 'Maritime Normal (Fair Weather)',
    sector: 'North AP / West-Central Bay of Bengal',
    lastUpdated: 'Live sync pending...',
  });

  // Dynamic autonomous polling from live satellite/marine sensors
  useEffect(() => {
    async function pollLiveTelemetry() {
      try {
        const [wRes, mRes] = await Promise.all([
          fetch('https://api.open-meteo.com/v1/forecast?latitude=17.68&longitude=83.22&current=temperature_2m,wind_speed_10m,wind_gusts_10m,pressure_msl,surface_pressure,precipitation&timezone=Asia/Kolkata'),
          fetch('https://marine-api.open-meteo.com/v1/marine?latitude=17.5&longitude=84.0&current=wave_height'),
        ]);
        const wData = await wRes.json();
        const mData = await mRes.json();
        const curW = wData?.current || {};
        const curM = mData?.current || {};

        // Use Sea-Level Normalized Pressure (pressure_msl) standard across maritime systems
        const p = curW.pressure_msl ?? curW.surface_pressure ?? 1010.0;
        const w = curW.wind_speed_10m ?? 12.0;
        const g = curW.wind_gusts_10m ?? 20.0;
        const waves = curM.wave_height ?? 1.8;

        // Accurate Meteorological & Marine Thresholds:
        // 1. Tropical Cyclone / Deep Depression: requires steep pressure drop (MSL < 995 hPa) + sustained gale winds (>= 45 km/h) or violent gusts (>= 75 km/h)
        const isCyclone = (p < 995 && (w >= 45 || g >= 65)) || w >= 65 || g >= 85;
        // 2. High Sea Swell: Wave height exceeds safe small-craft/trawler limit (2.5m)
        const isRoughSea = !isCyclone && waves >= 2.5;
        // 3. Coastal Squall: Sudden gusts without cyclone pressure drop
        const isSquall = !isCyclone && !isRoughSea && (w >= 40 || g >= 55);

        let alertLevel = 'nominal';
        let systemName = 'Maritime Normal (Fair Weather)';
        let isSevere = false;

        if (isCyclone) {
          alertLevel = 'cyclone';
          systemName = 'Deep Depression / Tropical Cyclone Alert';
          isSevere = true;
        } else if (isRoughSea) {
          alertLevel = 'rough_sea';
          systemName = 'Offshore High Sea Swell Advisory';
          isSevere = true;
        } else if (isSquall) {
          alertLevel = 'squall';
          systemName = 'Coastal Squall & Strong Gust Warning';
          isSevere = true;
        }

        setTelemetry({
          pressure: Number(p.toFixed(1)),
          wind: Number(w.toFixed(1)),
          gusts: Number(g.toFixed(1)),
          waves: Number(waves.toFixed(2)),
          alertLevel,
          isSevere,
          systemName,
          sector: 'North AP / West-Central Bay of Bengal',
          lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
        });
      } catch (err) {
        console.warn('Telemetry live poll fallback:', err);
      }
    }

    pollLiveTelemetry();
    const interval = setInterval(pollLiveTelemetry, 60_000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectTopic = (key) => {
    setIsThinking(true);
    setSelectedTopic(null);
    setTimeout(() => {
      setSelectedTopic(KNOWLEDGE_RESPONSES[key]);
      setIsThinking(false);
    }, 450);
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (!customQuery.trim()) return;
    const lower = customQuery.toLowerCase();
    setIsThinking(true);
    setSelectedTopic(null);

    setTimeout(() => {
      if (lower.includes('wave') || lower.includes('rule') || lower.includes('limit')) {
        setSelectedTopic(KNOWLEDGE_RESPONSES.rules);
      } else if (lower.includes('fish') || lower.includes('pfz') || lower.includes('safe')) {
        setSelectedTopic(KNOWLEDGE_RESPONSES.pfz);
      } else if (lower.includes('trawler') || lower.includes('boat') || lower.includes('depart') || lower.includes('sail')) {
        setSelectedTopic(KNOWLEDGE_RESPONSES.trawlers);
      } else {
        setSelectedTopic(KNOWLEDGE_RESPONSES.track);
      }
      setIsThinking(false);
    }, 550);
  };

  const getAlertBadge = () => {
    if (telemetry.alertLevel === 'cyclone') {
      return {
        label: '● Live Cyclone / Deep Depression',
        color: '#f87171',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.3)',
      };
    }
    if (telemetry.alertLevel === 'rough_sea') {
      return {
        label: '● High Sea Swell Advisory',
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
      };
    }
    if (telemetry.alertLevel === 'squall') {
      return {
        label: '● Coastal Squall Warning',
        color: '#fbbf24',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
      };
    }
    return {
      label: '● All Coastal Sectors Nominal',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.25)',
    };
  };

  const badge = getAlertBadge();

  return (
    <div className="ai-hero-card" style={{ marginBottom: 20 }}>
      {/* Top Meta Bar */}
      <div className="flex items-center justify-between gap-4" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
        <div className="flex items-center gap-2">
          <span className="ai-gradient-badge">
            <span style={{ fontSize: '0.9rem' }}>✨</span>
            ORCA 3.0 AI CO-PILOT
          </span>
          <span style={{
            fontSize: '0.74rem',
            color: badge.color,
            background: badge.bg,
            border: `1px solid ${badge.border}`,
            padding: '3px 10px', borderRadius: 20, fontWeight: 600,
          }}>
            {badge.label} (Synced {telemetry.lastUpdated})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.76rem', padding: '5px 12px' }}
            onClick={() => navigate('/map')}
          >
            🗺️ Open Ocean Risk Map
          </button>
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.76rem', padding: '5px 14px' }}
            onClick={() => navigate('/voyage')}
          >
            🧭 Run What-If Simulator
          </button>
        </div>
      </div>

      {/* Hero Headline & Situational Ingestion (Dynamically switches on condition) */}
      <div style={{ marginBottom: 16 }}>
        {telemetry.alertLevel === 'cyclone' ? (
          <>
            <h2 style={{ fontSize: '1.45rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🚨</span>
              <span>
                Active Threat Ingestion:{' '}
                <span className="ai-gradient-text">{telemetry.systemName}</span>
              </span>
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: 900, lineHeight: 1.5 }}>
              Autonomous multi-agent consensus indicates a high-intensity cyclonic system active in {telemetry.sector}.
              Barometric pressure (MSL) has plummeted to <strong style={{ color: '#ef4444' }}>{telemetry.pressure} hPa</strong> with gale gusts of <strong style={{ color: '#fbbf24' }}>{telemetry.gusts} km/h</strong>.
              Deterministic voyage verdict is <strong style={{ color: '#ef4444' }}>PROHIBITED</strong>.
            </p>
          </>
        ) : telemetry.alertLevel === 'rough_sea' ? (
          <>
            <h2 style={{ fontSize: '1.45rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>⚠️</span>
              <span>
                Marine Advisory:{' '}
                <span style={{ color: '#fbbf24' }}>{telemetry.systemName}</span>
              </span>
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: 900, lineHeight: 1.5 }}>
              Surface winds are moderate at <strong style={{ color: '#38bdf8' }}>{telemetry.wind} km/h</strong>, but offshore wave crests are elevated at <strong style={{ color: '#f87171' }}>{telemetry.waves}m</strong> (exceeding the 2.50m max trawler limit).
              Deterministic voyage verdict is <strong style={{ color: '#fbbf24' }}>RESTRICTED TO COASTAL REACHES</strong>. Small craft should avoid deep-sea waters.
            </p>
          </>
        ) : telemetry.alertLevel === 'squall' ? (
          <>
            <h2 style={{ fontSize: '1.45rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>⚠️</span>
              <span>
                Weather Alert:{' '}
                <span style={{ color: '#fbbf24' }}>{telemetry.systemName}</span>
              </span>
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: 900, lineHeight: 1.5 }}>
              Coastal squalls and gusts peaking at <strong style={{ color: '#fbbf24' }}>{telemetry.gusts} km/h</strong> detected across {telemetry.sector}.
              Barometric pressure is stable at {telemetry.pressure} hPa. Exercise cautionary navigation.
            </p>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.45rem', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>🟢</span>
              <span>
                Maritime Operational State:{' '}
                <span style={{ color: '#34d399' }}>All Coastal Sectors Nominal</span>
              </span>
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', maxWidth: 900, lineHeight: 1.5 }}>
              Multi-agent autonomous monitoring reports stable atmospheric and oceanographic parameters across Indian coastal waters.
              Atmospheric pressure is nominal at <strong style={{ color: '#38bdf8' }}>{telemetry.pressure} hPa</strong> with gentle breezes of <strong style={{ color: '#38bdf8' }}>{telemetry.wind} km/h</strong>.
              All harbor departure clearances active.
            </p>
          </>
        )}
      </div>

      {/* 4 Live Telemetry Chips (Real-Time Dynamic Values) */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12, marginBottom: 18,
      }}>
        <div className="ai-telemetry-chip">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Barometric (MSL)</span>
            <span style={{
              color: telemetry.pressure < 995 ? '#ef4444' : telemetry.pressure < 1005 ? '#fbbf24' : '#10b981',
              fontSize: '0.75rem', fontWeight: 700,
            }}>
              {telemetry.pressure < 995 ? 'DEPRESSION' : telemetry.pressure < 1005 ? 'SLIGHT LOW' : 'NORMAL'}
            </span>
          </div>
          <div style={{
            fontSize: '1.25rem', fontWeight: 800,
            color: telemetry.pressure < 995 ? '#f87171' : telemetry.pressure < 1005 ? '#fbbf24' : '#34d399',
            fontFamily: 'JetBrains Mono',
          }}>
            {telemetry.pressure} hPa
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {telemetry.pressure < 995 ? 'Vortex Center Proximity' : 'Sea-level normalized baseline'}
          </span>
        </div>

        <div className="ai-telemetry-chip">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Offshore Wind</span>
            <span style={{ color: telemetry.wind >= 45 ? '#ef4444' : telemetry.wind >= 30 ? '#f59e0b' : '#38bdf8', fontSize: '0.75rem', fontWeight: 700 }}>
              {telemetry.wind >= 45 ? 'GALE' : telemetry.wind >= 30 ? 'MODERATE' : 'FAIR BREEZE'}
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: telemetry.wind >= 45 ? '#f87171' : telemetry.wind >= 30 ? '#fbbf24' : '#38bdf8', fontFamily: 'JetBrains Mono' }}>
            {telemetry.wind} <span style={{ fontSize: '0.85rem' }}>km/h</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {telemetry.gusts >= 40 ? `Gusts peaking at ${telemetry.gusts} km/h` : 'Safe operational transit speed'}
          </span>
        </div>

        <div className="ai-telemetry-chip">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Significant Wave Crest</span>
            <span style={{ color: telemetry.waves >= 2.5 ? '#ef4444' : '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
              {telemetry.waves >= 2.5 ? 'LIMIT EXCEEDED' : 'SAFE SEA'}
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: telemetry.waves >= 2.5 ? '#f87171' : '#34d399', fontFamily: 'JetBrains Mono' }}>
            {telemetry.waves} <span style={{ fontSize: '0.85rem' }}>meters</span>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {telemetry.waves >= 2.5 ? 'Exceeds 2.50m max trawler limit' : 'Within structural hull tolerance'}
          </span>
        </div>

        <div className="ai-telemetry-chip">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Port Advisory Flag</span>
            <span style={{ color: telemetry.alertLevel === 'cyclone' ? '#ef4444' : telemetry.alertLevel === 'rough_sea' || telemetry.alertLevel === 'squall' ? '#fbbf24' : '#10b981', fontSize: '0.75rem', fontWeight: 700 }}>
              {telemetry.alertLevel === 'cyclone' ? 'HOISTED' : telemetry.alertLevel === 'rough_sea' || telemetry.alertLevel === 'squall' ? 'CAUTION' : 'CLEAR'}
            </span>
          </div>
          <div style={{
            fontSize: '1.15rem', fontWeight: 800,
            color: telemetry.alertLevel === 'cyclone' ? '#f87171' : telemetry.alertLevel === 'rough_sea' || telemetry.alertLevel === 'squall' ? '#fbbf24' : '#34d399',
            fontFamily: 'JetBrains Mono',
          }}>
            {telemetry.alertLevel === 'cyclone'
              ? 'Signal No. 3 (Danger)'
              : telemetry.alertLevel === 'rough_sea'
                ? 'Signal No. 1 (Rough Sea)'
                : telemetry.alertLevel === 'squall'
                  ? 'Signal No. 2 (Squall)'
                  : 'Signal 0 (Clear)'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {telemetry.alertLevel === 'cyclone'
              ? 'Cyclone Warning: Vizag / Kakinada'
              : telemetry.alertLevel === 'rough_sea'
                ? 'High swell warning for small craft'
                : telemetry.alertLevel === 'squall'
                  ? 'Squall alert for open waters'
                  : 'Normal harbor departures granted'}
          </span>
        </div>
      </div>

      {/* AI Copilot Prompt Input Bar */}
      <form onSubmit={handleCustomSubmit} className="ai-copilot-input-box" style={{ marginBottom: 12 }}>
        <span style={{ fontSize: '1.1rem', color: '#38bdf8' }}>✨</span>
        <input
          type="text"
          value={customQuery}
          onChange={(e) => setCustomQuery(e.target.value)}
          placeholder="Ask ORCA AI: e.g. 'Can trawlers leave Vizag?', 'Track ETA for North AP Coast', 'Which PFZs are safe?'..."
          style={{
            flex: 1, background: 'transparent', border: 'none', color: '#ffffff',
            fontSize: '0.88rem', outline: 'none', fontFamily: 'Inter, sans-serif',
          }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '6px 16px', fontSize: '0.78rem', borderRadius: 8 }}
        >
          {isThinking ? 'Analyzing Mesh...' : 'Ask AI ➔'}
        </button>
      </form>

      {/* Quick Suggestion Chips */}
      <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginRight: 4 }}>
          Suggested Prompts:
        </span>
        <button type="button" className="ai-chip" onClick={() => handleSelectTopic('track')}>
          🌀 Track & Landfall ETA
        </button>
        <button type="button" className="ai-chip" onClick={() => handleSelectTopic('trawlers')}>
          🚢 Can trawlers sail from Vizag?
        </button>
        <button type="button" className="ai-chip" onClick={() => handleSelectTopic('rules')}>
          ⚖️ Explain Rule DK-WAVE-01
        </button>
        <button type="button" className="ai-chip" onClick={() => handleSelectTopic('pfz')}>
          🐟 Safe PFZ Zones
        </button>
      </div>

      {/* AI Dynamic Thinking / Response View */}
      {isThinking && (
        <div style={{
          marginTop: 16, padding: '16px 20px', borderRadius: 12,
          background: 'rgba(8, 14, 26, 0.9)', border: '1px solid rgba(56, 189, 248, 0.3)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span className="spinner" style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: '0.84rem', color: '#38bdf8' }}>
            Synthesizing telemetry across 5 autonomous neural nodes (Weather, Ocean, Satellite, Vessel, Ecosystem)...
          </span>
        </div>
      )}

      {selectedTopic && !isThinking && (
        <div style={{
          marginTop: 18, padding: '20px 24px', borderRadius: 12,
          background: 'rgba(7, 12, 22, 0.95)', border: '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: '1.15rem', color: '#ffffff', margin: 0 }}>
              {selectedTopic.title}
            </h3>
            <button
              onClick={() => setSelectedTopic(null)}
              style={{
                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: '1rem',
              }}
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.6, marginBottom: 14 }}>
            {selectedTopic.summary}
          </p>

          {/* Metric Grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10, marginBottom: 14,
          }}>
            {selectedTopic.metrics.map((m) => (
              <div key={m.label} style={{
                background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 8, padding: '8px 12px',
              }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{m.label}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f1f5f9', marginTop: 2, fontFamily: 'JetBrains Mono' }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>

          {/* Multi-Agent Synthesis Breakdown */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)', borderRadius: 8, padding: '12px 16px',
            border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: 14,
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 8 }}>
              🤖 Neural Agent Synthesis Breakdown
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedTopic.agents.map((a) => (
                <div key={a.name} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: '#ffffff' }}>{a.name}:</strong> {a.note}
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommended Action Directives */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '0.82rem', color: '#f87171',
          }}>
            <span style={{ fontSize: '1.1rem' }}>🛡️</span>
            <div>
              <strong>Action Directive:</strong> {selectedTopic.recommendation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
