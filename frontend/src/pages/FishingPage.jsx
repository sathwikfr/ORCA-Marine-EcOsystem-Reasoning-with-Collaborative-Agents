// frontend/src/pages/FishingPage.jsx
// Real-Time Fishing Zone Intelligence v2
// — Marine API for swell/period/direction
// — Wind direction: OFFSHORE / ONSHORE / PARALLEL
// — Lunar phase + fish activity scoring
// — Dual departure windows: Safest vs Best Catch

import { useState, useEffect, useCallback } from 'react';
import {
  HARBORS, PFZ_ZONES,
  calcDistanceNm, calcBearing, bearingLabel, CATCH_DISCLAIMER,
} from '../services/pfzData';
import { VESSEL_PROFILES } from '../services/decisionKernel';
import {
  fetchLiveZoneConditions,
  evaluateHourlySlots,
  findBestDepartureWindow,
  longestContiguousGoBlock,
  isMonsoonBanActive,
  getMonsoonBanText,
  beaufortLabel,
  compassLabel,
  getLunarPhase,
  fishActivityLabel,
} from '../services/fishingUtils';

// ── VerdictPill ─────────────────────────────────────────────────────────────
function VerdictPill({ verdict }) {
  const map = {
    GO:        { label: '🟢 GO',          bg: 'rgba(34,197,94,0.15)',  border: 'rgba(34,197,94,0.4)',  color: '#4ade80' },
    CAUTION:   { label: '🟡 CAUTION',     bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', color: '#fbbf24' },
    NO_GO:     { label: '🔴 NO-GO',       bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  color: '#f87171' },
    RESTRICTED:{ label: '⛔ RESTRICTED',  bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.4)',  color: '#f87171' },
  };
  const s = map[verdict] || map.CAUTION;
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 700, padding: '3px 9px', borderRadius: 999,
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
      letterSpacing: '0.04em', fontFamily: 'JetBrains Mono',
    }}>{s.label}</span>
  );
}

// ── Lunar Banner ─────────────────────────────────────────────────────────────
function LunarBanner({ lunar }) {
  if (!lunar) return null;
  const act = fishActivityLabel(lunar.fishingBonus > 1.3 ? 0.85 : 0.5);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      padding: '10px 18px', borderRadius: 10,
      background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
    }}>
      <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>{lunar.emoji}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#a5b4fc', marginBottom: 2 }}>
          {lunar.name} — {lunar.illumination}% Illuminated
        </div>
        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          Lunar fishing conditions: <strong style={{ color: act.color }}>{act.emoji} {act.label}</strong>
          {' · '}Solunar peak activity factor: <strong style={{ color: '#a5b4fc' }}>{lunar.fishingBonus.toFixed(2)}×</strong>
        </div>
      </div>
    </div>
  );
}

// ── HourlySlotBar ────────────────────────────────────────────────────────────
function HourlySlotBar({ slots }) {
  if (!slots?.length) return null;
  return (
    <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
      <div style={{ display: 'flex', gap: 2, minWidth: 'max-content', marginBottom: 2 }}>
        {slots.map((s, i) => {
          // Fish activity overlay intensity
          const fa = s.fishActivity ?? 0;
          return (
            <div
              key={i}
              title={[
                `${s.localTime}  ${s.emoji} ${s.verdict}`,
                s.reason,
                `Wave: ${s.waveM}m | Swell: ${s.swellM}m (${s.swellPeriodSec}s)`,
                `Wind: ${s.windKmph} km/h ${s.windDirInfo ? s.windDirInfo.label : ''}`,
                `Fish activity: ${s.fishInfo?.label ?? '—'} (${(fa * 100).toFixed(0)}%)`,
              ].join('\n')}
              style={{
                width: 22, height: 32, borderRadius: 4,
                background: `linear-gradient(to top, ${s.fishInfo?.color ?? '#94a3b8'}${Math.round(fa * 100).toString(16).padStart(2,'0')}, ${s.color}33)`,
                border: `1.5px solid ${s.color}66`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, cursor: 'help', transition: 'transform 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.25)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
              {fa >= 0.5 && <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.fishInfo?.color }} />}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 2, minWidth: 'max-content' }}>
        {slots.map((s, i) => (
          <div key={i} style={{
            width: 22, textAlign: 'center',
            fontSize: '0.52rem', color: 'var(--text-muted)',
            visibility: i % 3 === 0 ? 'visible' : 'hidden',
          }}>
            {s.localTime?.slice(0, 5)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LiveWeatherStrip v2 ───────────────────────────────────────────────────────
function LiveWeatherStrip({ current }) {
  if (!current) return null;
  const windLabel = beaufortLabel(current.windKmph);
  const windComp  = compassLabel(current.windDir);
  const swellDanger = current.wavePeriod > 12;

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Data source badge */}
      {current.marineDataAvailable === false && (
        <div style={{
          fontSize: '0.62rem', color: '#94a3b8', marginBottom: 5,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ color: '#f59e0b' }}>◈</span>
          Marine API unavailable for this coordinate — using ECMWF forecast wave data
        </div>
      )}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
        background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)',
        borderRadius: 8, padding: '10px 12px',
      }}>
        {[
          {
            label: 'Wind',
            value: `${current.windKmph} km/h`,
            sub: `${windLabel} · ${windComp}`,
            color: '#00d4ff',
          },
          {
            label: current.marineDataAvailable !== false ? 'Swell Height' : 'Wave Height',
            value: `${current.swellM > 0 ? current.swellM : current.waveM} m`,
            sub: `Period: ${current.wavePeriod}s ${swellDanger ? '⚠️ Long' : ''}`,
            color: swellDanger ? '#f59e0b' : '#3b82f6',
          },
          {
            label: 'Wave (combined)',
            value: `${current.waveM} m`,
            sub: `Pressure: ${current.pressure} hPa`,
            color: current.pressure < 1005 ? '#f59e0b' : '#94a3b8',
          },
        ].map(({ label, value, sub, color }) => (
          <div key={label}>
            <div style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color, fontFamily: 'JetBrains Mono' }}>{value}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── Dual Departure Window Card ────────────────────────────────────────────────
function DualWindowCard({ safeWindow, fishingWindow, transitHours, activityHours }) {
  const [activeTab, setActiveTab] = useState('fishing');
  const window = activeTab === 'safe' ? safeWindow : fishingWindow;

  if (!safeWindow && !fishingWindow) {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: 8, padding: '10px 14px', fontSize: '0.78rem', color: '#f87171',
      }}>
        🚫 No safe departure window found in the next 24 hours. Monitor conditions.
      </div>
    );
  }

  const isSameWindow = safeWindow?.departureTime === fishingWindow?.departureTime;
  const returnVerdict = window?.returnSlot?.verdict || 'CAUTION';
  const returnColor   = window?.returnSlot?.color   || '#f59e0b';
  const avgFishAct    = window?.avgFishActivity ?? 0;
  const fishInfo      = fishActivityLabel(avgFishAct);

  return (
    <div style={{
      border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, overflow: 'hidden',
    }}>
      {/* Tab bar */}
      {!isSameWindow && (
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {[
            { id: 'fishing', label: '🎣 Best Catch Window', color: '#4ade80' },
            { id: 'safe',    label: '🛡️ Safest Window',    color: '#00d4ff' },
          ].map(({ id, label, color }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1, padding: '7px 12px', fontSize: '0.73rem', cursor: 'pointer',
                background: activeTab === id ? 'rgba(255,255,255,0.05)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === id ? `2px solid ${color}` : '2px solid transparent',
                color: activeTab === id ? color : 'var(--text-muted)',
                fontWeight: activeTab === id ? 700 : 400,
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: '12px 14px', background: 'rgba(34,197,94,0.06)' }}>
        {isSameWindow && (
          <div style={{ fontSize: '0.68rem', color: '#4ade80', marginBottom: 8 }}>
            ✅ Both windows are identical — optimal trip!
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: 2 }}>Depart</div>
            <div style={{ color: '#00d4ff', fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '0.95rem' }}>
              {window?.departureTime} IST
            </div>
          </div>
          {window?.arrivalTime && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: 2 }}>On Zone</div>
              <div style={{ color: '#a5b4fc', fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '0.95rem' }}>
                {window.arrivalTime} IST
              </div>
            </div>
          )}
          {window?.returnTime && (
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: 2 }}>Return by</div>
              <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: '0.95rem', color: returnColor }}>
                {window.returnTime} IST
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          <span>🕒 {window?.durationHours}h total trip</span>
          <span>🟢 {window?.goCount}h GO</span>
          {(window?.cautionCount ?? 0) > 0 && <span>🟡 {window.cautionCount}h CAUTION</span>}
          <span style={{ color: fishInfo.color }}>
            {fishInfo.emoji} On-zone: {fishInfo.label}
          </span>
          {window?.returnSlot && (
            <span style={{ color: returnColor }}>
              Return: {window.returnSlot.windKmph} km/h · {window.returnSlot.waveM}m wave
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Wave Detail Strip ─────────────────────────────────────────────────────────
function WaveDetailStrip({ slot }) {
  if (!slot) return null;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
      background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
      borderRadius: 6, padding: '8px 10px', fontSize: '0.72rem', marginBottom: 10,
    }}>
      {[
        { label: 'Combined Wave', value: `${slot.waveM}m`, sub: `${slot.wavePeriodSec}s period`, color: '#60a5fa' },
        { label: 'Swell', value: `${slot.swellM}m`, sub: `${slot.swellPeriodSec}s · ${compassLabel(slot.swellDir)}`, color: slot.swellPeriodSec > 12 ? '#f59e0b' : '#6366f1' },
        { label: 'Wind Chop', value: `${slot.windWaveM}m`, sub: `${slot.windWavePeriod}s period`, color: '#94a3b8' },
        { label: 'Current', value: `${slot.currentKnots} kts`, sub: 'surface drift', color: '#22d3ee' },
      ].map(({ label, value, sub, color }) => (
        <div key={label}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem', marginBottom: 2 }}>{label}</div>
          <strong style={{ color, fontFamily: 'JetBrains Mono' }}>{value}</strong>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.58rem', marginTop: 1 }}>{sub}</div>
        </div>
      ))}
    </div>
  );
}

// ── ZoneCard ──────────────────────────────────────────────────────────────────
function ZoneCard({ zone, harbor, vessel, vesselType, isRestricted }) {
  const [state, setState] = useState({ status: 'loading', hourly: null, current: null, slots: null, windows: null, fetchedAt: null, error: null });
  const [showWaveDetail, setShowWaveDetail] = useState(false);

  const distNm     = calcDistanceNm(harbor.lat, harbor.lon, zone.lat, zone.lon);
  const bearing    = calcBearing(harbor.lat, harbor.lon, zone.lat, zone.lon);
  const bearDir    = bearingLabel(bearing);
  const transitHrs = +(distNm / vessel.cruiseSpeedKnots).toFixed(1);
  const activityHrs = 4;

  const load = useCallback(() => {
    if (isRestricted) { setState(s => ({ ...s, status: 'restricted' })); return; }
    setState(s => ({ ...s, status: 'loading', error: null }));
    fetchLiveZoneConditions(zone.lat, zone.lon)
      .then(({ hourly, current }) => {
        const slots   = evaluateHourlySlots(hourly, vesselType, zone.lon, zone.shoreBearing ?? 270);
        const windows = findBestDepartureWindow(slots, transitHrs, activityHrs);
        setState({ status: 'ok', hourly, current, slots, windows, fetchedAt: new Date(), error: null });
      })
      .catch((err) => setState(s => ({ ...s, status: 'error', error: err.message })));
  }, [zone.lat, zone.lon, zone.shoreBearing, vesselType, isRestricted, transitHrs]);

  useEffect(() => { load(); }, [load]);

  const overallVerdict = (() => {
    if (isRestricted) return 'RESTRICTED';
    if (state.status !== 'ok' || !state.slots?.[0]) return null;
    return state.slots[0].verdict;
  })();

  const longestGo  = state.slots ? longestContiguousGoBlock(state.slots) : 0;
  const minsAgo    = state.fetchedAt ? Math.round((Date.now() - state.fetchedAt) / 60000) : null;
  const currentHourSlot = state.slots?.[0];

  return (
    <div
      className="card-glass"
      style={{
        padding: 20, borderRadius: 12,
        border: isRestricted
          ? '1px solid rgba(239,68,68,0.4)'
          : overallVerdict === 'GO'    ? '1px solid rgba(34,197,94,0.25)'
          : overallVerdict === 'NO_GO' ? '1px solid rgba(239,68,68,0.25)'
          : '1px solid var(--border)',
        transition: 'border-color 0.3s',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.63rem' }}>{zone.sector}</span>
            {overallVerdict && <VerdictPill verdict={overallVerdict} />}
            {minsAgo !== null && (
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                🔄 {minsAgo === 0 ? 'Just now' : `${minsAgo}m ago`}
              </span>
            )}
            {state.status === 'loading' && (
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>⏳ Fetching…</span>
            )}
          </div>
          <h3 style={{ margin: 0, fontSize: '0.98rem', lineHeight: 1.3 }}>{zone.name}</h3>
        </div>
        <button onClick={load} title="Refresh" style={{
          background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 6, padding: '4px 7px', cursor: 'pointer', color: '#00d4ff', fontSize: '0.78rem',
        }}>↻</button>
      </div>

      {/* Nav metrics */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
        background: 'rgba(255,255,255,0.02)', padding: '9px 12px', borderRadius: 8, marginBottom: 12,
      }}>
        {[
          { label: 'Distance', value: `${distNm} NM`, color: '#00d4ff' },
          { label: 'Bearing',  value: `${bearing}° ${bearDir}`, color: 'var(--text-primary)' },
          { label: 'Transit',  value: `${transitHrs} hrs`,      color: 'var(--text-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
            <strong style={{ fontSize: '0.85rem', color, fontFamily: 'JetBrains Mono' }}>{value}</strong>
          </div>
        ))}
      </div>

      {/* Current conditions strip */}
      {state.status === 'ok' && <LiveWeatherStrip current={state.current} />}

      {/* Wind direction info for current hour */}
      {state.status === 'ok' && currentHourSlot?.windDirInfo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          padding: '6px 10px', borderRadius: 6, marginBottom: 10,
          background: `${currentHourSlot.windDirInfo.color}11`,
          border: `1px solid ${currentHourSlot.windDirInfo.color}33`,
          fontSize: '0.73rem',
        }}>
          <span style={{ color: currentHourSlot.windDirInfo.color, fontWeight: 600 }}>
            {currentHourSlot.windDirInfo.label}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>
            Wind from {compassLabel(currentHourSlot.windDir)} ({currentHourSlot.windDir}°)
          </span>
          {currentHourSlot.windDirInfo.type === 'OFFSHORE' && (
            <span style={{ color: '#fbbf24', fontSize: '0.68rem' }}>
              ⚠️ Wind pushing boats away from coast — high return risk
            </span>
          )}
        </div>
      )}

      {/* Wave detail toggle */}
      {state.status === 'ok' && currentHourSlot && (
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={() => setShowWaveDetail(v => !v)}
            style={{
              fontSize: '0.68rem', color: '#60a5fa', background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, marginBottom: 6,
            }}
          >
            🌊 {showWaveDetail ? 'Hide' : 'Show'} Wave Breakdown (swell vs chop)
          </button>
          {showWaveDetail && <WaveDetailStrip slot={currentHourSlot} />}
        </div>
      )}

      {/* Error fallback */}
      {state.status === 'error' && (
        <div style={{
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 12,
          fontSize: '0.72rem', color: '#fbbf24',
        }}>
          ⚠️ Live data unavailable ({state.error}). Showing static zone data only.
        </div>
      )}

      {/* Restricted banner */}
      {isRestricted && (
        <div style={{
          background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8, padding: '8px 12px', marginBottom: 12,
          fontSize: '0.72rem', color: '#f87171',
        }}>⛔ {zone.restrictionReason}</div>
      )}

      {/* 24-hour hourly slot bar */}
      {state.status === 'ok' && state.slots && !isRestricted && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              24h Safety + Fish Activity (hover for details)
            </span>
            <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>
              Longest GO: <strong style={{ color: '#4ade80' }}>{longestGo}h</strong>
            </span>
          </div>
          <HourlySlotBar slots={state.slots} />
        </div>
      )}

      {/* Dual departure windows */}
      {state.status === 'ok' && !isRestricted && state.windows && (
        <div style={{ marginBottom: 14 }}>
          <DualWindowCard
            safeWindow={state.windows.safeWindow}
            fishingWindow={state.windows.fishingWindow}
            transitHours={transitHrs}
            activityHours={activityHrs}
          />
        </div>
      )}

      {/* Oceanographic data */}
      <div style={{ fontSize: '0.74rem', marginBottom: 12 }}>
        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600 }}>
          Oceanographic Indicators (INCOIS Bulletin)
        </div>
        {[
          { label: 'Chlorophyll-a', value: `${zone.chlorophyll} mg/m³`, color: '#4ade80' },
          { label: 'SST',           value: `${zone.sst}°C (gradient ${zone.gradient}°C/km)`, color: 'var(--text-primary)' },
          { label: 'Depth',         value: `${zone.depthM} m bathymetry`, color: 'var(--text-primary)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
            <strong className="mono" style={{ color, fontSize: '0.73rem' }}>{value}</strong>
          </div>
        ))}
      </div>

      {/* Species */}
      <div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600 }}>
          Expected Pelagic Species
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {zone.species.map((sp, i) => (
            <span key={i} style={{
              fontSize: '0.66rem', background: 'rgba(255,255,255,0.04)',
              padding: '3px 7px', borderRadius: 4, border: '1px solid var(--border)',
            }}>🐟 {sp}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Monsoon Ban Banner ──────────────────────────────────────────────────────
function MonsoonBanBanner({ vesselType, zoneLon }) {
  const active = isMonsoonBanActive(vesselType, zoneLon);
  if (!active) return null;
  return (
    <div style={{
      padding: '12px 18px', borderRadius: 10,
      background: 'rgba(239,68,68,0.10)', border: '1.5px solid rgba(239,68,68,0.4)',
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🚫</span>
      <div>
        <div style={{ color: '#f87171', fontWeight: 700, marginBottom: 3 }}>Annual Monsoon Trawling Ban — Active</div>
        <div style={{ fontSize: '0.78rem', color: '#fca5a5', lineHeight: 1.5 }}>
          {getMonsoonBanText(vesselType, zoneLon)}
        </div>
      </div>
    </div>
  );
}

// ── Legend ──────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{
      display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
      padding: '10px 16px', background: 'rgba(255,255,255,0.02)',
      border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.73rem',
    }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Hourly slot:</span>
      {[
        { color: '#22c55e', label: '🟢 GO' },
        { color: '#f59e0b', label: '🟡 CAUTION' },
        { color: '#ef4444', label: '🔴 NO-GO' },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: color + '44', border: `2px solid ${color}` }} />
          <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        </div>
      ))}
      <span style={{ color: 'var(--text-muted)', fontSize: '0.66rem' }}>
        + bottom dot = 🎣 peak fish activity
      </span>
      <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: '0.65rem' }}>
        Sources: Open-Meteo Marine ECMWF + Atmospheric · Hover slots for swell/chop breakdown
      </span>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export function FishingPage() {
  const [selectedHarborId, setSelectedHarborId] = useState('H-VIZAG');
  const [vesselType, setVesselType]             = useState('MECHANIZED_TRAWLER');
  const [refreshKey, setRefreshKey]             = useState(0);
  const lunar = getLunarPhase();

  const harbor = HARBORS.find((h) => h.id === selectedHarborId) || HARBORS[0];
  const vessel = VESSEL_PROFILES[vesselType] || VESSEL_PROFILES.MECHANIZED_TRAWLER;

  useEffect(() => {
    const id = setInterval(() => setRefreshKey((k) => k + 1), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const sortedZones = [...PFZ_ZONES].sort((a, b) =>
    calcDistanceNm(harbor.lat, harbor.lon, a.lat, a.lon) -
    calcDistanceNm(harbor.lat, harbor.lon, b.lat, b.lon)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ margin: 0 }}>🎣 Fishing Zone Intelligence</h1>
            <span className="badge badge-cyan">LIVE · MARINE ECMWF + ATMOSPHERIC</span>
          </div>
          <p style={{ marginTop: 4, color: 'var(--text-muted)' }}>
            Swell vs wind-chop separation · Offshore/onshore wind analysis · Lunar fish activity · Dual departure windows
          </p>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() => setRefreshKey((k) => k + 1)}
          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
        >
          🔄 Refresh All
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: '10px 16px', borderRadius: 8,
        background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.22)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: '1.1rem' }}>⚠️</span>
        <div style={{ fontSize: '0.76rem', color: '#facc15' }}>
          <strong>Scientific Notice: </strong>{CATCH_DISCLAIMER}
        </div>
      </div>

      {/* Lunar phase banner */}
      <LunarBanner lunar={lunar} />

      {/* Monsoon ban */}
      <MonsoonBanBanner vesselType={vesselType} zoneLon={harbor.lon} />

      {/* Controls */}
      <div className="card-glass" style={{ padding: 16, display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            Departure Harbor / Landing Centre
          </label>
          <select className="input" value={selectedHarborId} onChange={(e) => setSelectedHarborId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px' }}>
            {HARBORS.map((h) => (
              <option key={h.id} value={h.id}>{h.name} ({h.state}) · Fleet: ~{h.fleet}</option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ fontSize: '0.71rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
            Vessel Classification
          </label>
          <select className="input" value={vesselType} onChange={(e) => setVesselType(e.target.value)}
            style={{ width: '100%', padding: '8px 12px' }}>
            <option value="MECHANIZED_TRAWLER">Mechanized Trawler (12-15m · Wave ≤2.5m · Wind ≤45 km/h)</option>
            <option value="TRADITIONAL_MOTORIZED">Traditional FRP Motorized (8-10m · Wave ≤1.6m · Wind ≤30 km/h)</option>
            <option value="DEEP_SEA">Deep Sea Longliner (&gt;20m · Wave ≤4m · Wind ≤65 km/h)</option>
          </select>
        </div>

        {/* Vessel limits */}
        <div style={{
          minWidth: 180, background: 'rgba(0,212,255,0.06)',
          border: '1px solid rgba(0,212,255,0.18)', borderRadius: 8, padding: '8px 14px', fontSize: '0.72rem',
        }}>
          <div style={{ color: '#00d4ff', fontWeight: 600, marginBottom: 3 }}>Safety Envelope</div>
          <div style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            🌊 Swell-adjusted wave ≤ <strong style={{ color: 'var(--text-primary)' }}>{vessel.maxWaveM}m</strong><br />
            💨 Direction-adjusted wind ≤ <strong style={{ color: 'var(--text-primary)' }}>{vessel.maxWindKmph} km/h</strong>
          </div>
        </div>
      </div>

      {/* Legend */}
      <Legend />

      {/* Zone cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 18 }}>
        {sortedZones.map((zone) => (
          <ZoneCard
            key={`${zone.id}-${refreshKey}-${vesselType}-${selectedHarborId}`}
            zone={zone}
            harbor={harbor}
            vessel={vessel}
            vesselType={vesselType}
            isRestricted={!!zone.restricted}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-muted)', paddingTop: 4 }}>
        Marine data: Open-Meteo ECMWF Wave Model · Atmospheric: Open-Meteo · PFZ: INCOIS ·
        Lunar phase: computed mathematically (Meeus algorithm) · Auto-refresh: 15 min
      </div>
    </div>
  );
}
