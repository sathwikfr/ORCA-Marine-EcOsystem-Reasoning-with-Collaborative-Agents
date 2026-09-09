// frontend/src/pages/VoyagePlannerPage.jsx
// Predictive Voyage Assessment & What-If Route / Departure Window / Fuel Comparison

import { useState } from 'react';
import { generateWhatIfScenarios } from '../services/whatIfEngine';
import { evaluateDecision, VESSEL_PROFILES } from '../services/decisionKernel';
import { EvidenceModal } from '../components/common/EvidenceModal';
import { AuthorityBriefingModal } from '../components/common/AuthorityBriefingModal';

export function VoyagePlannerPage() {
  const [originPort, setOriginPort] = useState('Visakhapatnam Harbor');
  const [destination, setDestination] = useState('Outer Shelf PFZ (42 NM)');
  const [distanceNm, setDistanceNm] = useState(42.0);
  const [activityHours, setActivityHours] = useState(4.0);
  const [vesselType, setVesselType] = useState('MECHANIZED_TRAWLER');
  const [baseDepHour, setBaseDepHour] = useState(8);

  const [selectedOptionId, setSelectedOptionId] = useState('opt-early');
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [briefingModalOpen, setBriefingModalOpen] = useState(false);

  const report = generateWhatIfScenarios({
    originPort,
    destination,
    distanceNm: Number(distanceNm),
    activityHours: Number(activityHours),
    vesselType,
    baseDepartureHour: Number(baseDepHour),
  });

  const selectedOpt =
    report.options.find((o) => o.id === selectedOptionId) || report.options[0];

  const currentDecision = evaluateDecision({
    locationName: `${originPort} ➔ ${destination}`,
    windKmph: selectedOpt.maxWindKmph,
    waveHeightM: selectedOpt.maxWaveM,
    vesselType,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ margin: 0 }}>Predictive Voyage & What-If Planner</h1>
            <span className="badge badge-cyan">HYDRODYNAMIC FUEL MODEL</span>
          </div>
          <p style={{ marginTop: 4, color: 'var(--text-muted)' }}>
            Compare departure timing windows, waypoints, wave exposure, and diesel consumption
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="btn btn-ghost"
            onClick={() => setEvidenceModalOpen(true)}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            🔬 Inspect Evidence
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setBriefingModalOpen(true)}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            📋 Export Authority Briefing
          </button>
        </div>
      </div>

      {/* Control Panel Grid */}
      <div className="card-glass" style={{ padding: 20 }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: 14 }}>1. Voyage & Vessel Parameters</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
          }}
        >
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Origin Port
            </label>
            <select
              className="input"
              value={originPort}
              onChange={(e) => setOriginPort(e.target.value)}
              style={{ width: '100%', padding: '7px 10px' }}
            >
              <option value="Visakhapatnam Harbor">Visakhapatnam Harbor (AP)</option>
              <option value="Kakinada Deepwater Port">Kakinada Port (AP)</option>
              <option value="Chennai Kasimedu Harbor">Chennai Kasimedu (TN)</option>
              <option value="Kochi Thoppumpady Harbor">Kochi Harbor (KL)</option>
              <option value="Paradip Fishing Harbor">Paradip Harbor (OD)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Destination / Activity Area
            </label>
            <input
              type="text"
              className="input"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={{ width: '100%', padding: '7px 10px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Distance (NM One-Way)
            </label>
            <input
              type="number"
              className="input"
              value={distanceNm}
              onChange={(e) => setDistanceNm(e.target.value)}
              style={{ width: '100%', padding: '7px 10px' }}
              min="5"
              max="150"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              On-Station Activity (Hours)
            </label>
            <input
              type="number"
              className="input"
              value={activityHours}
              onChange={(e) => setActivityHours(e.target.value)}
              style={{ width: '100%', padding: '7px 10px' }}
              min="1"
              max="24"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Vessel Classification
            </label>
            <select
              className="input"
              value={vesselType}
              onChange={(e) => setVesselType(e.target.value)}
              style={{ width: '100%', padding: '7px 10px' }}
            >
              <option value="MECHANIZED_TRAWLER">Mechanized Trawler (12-15m, 120 HP)</option>
              <option value="TRADITIONAL_MOTORIZED">Traditional FRP Boat (8-10m, 25 HP)</option>
              <option value="DEEP_SEA">Deep Sea Longliner (&gt;20m, 350 HP)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
              Base Departure Hour (IST)
            </label>
            <select
              className="input"
              value={baseDepHour}
              onChange={(e) => setBaseDepHour(e.target.value)}
              style={{ width: '100%', padding: '7px 10px' }}
            >
              <option value="4">04:00 AM (Early Dawn)</option>
              <option value="6">06:00 AM (Sunrise)</option>
              <option value="8">08:00 AM (Morning)</option>
              <option value="12">12:00 PM (Noon)</option>
              <option value="16">04:00 PM (Evening)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Analytical Recommendation Banner */}
      <div
        style={{
          padding: '14px 20px',
          borderRadius: 8,
          background: 'rgba(0, 212, 255, 0.08)',
          border: '1px solid rgba(0, 212, 255, 0.25)',
          fontSize: '0.84rem',
        }}
      >
        <span style={{ fontWeight: 700, color: '#38bdf8' }}>💡 What-If Engine Recommendation: </span>
        <span style={{ color: 'var(--text-secondary)' }}>{report.summary}</span>
      </div>

      {/* What-If Comparison Cards */}
      <div>
        <h3 style={{ fontSize: '0.92rem', marginBottom: 12 }}>
          2. Compare Departure Timing &amp; Route Alternatives
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 14,
          }}
        >
          {report.options.map((opt) => {
            const isSelected = opt.id === selectedOptionId;
            return (
              <div
                key={opt.id}
                className="card-glass"
                onClick={() => setSelectedOptionId(opt.id)}
                style={{
                  padding: 18,
                  cursor: 'pointer',
                  borderRadius: 10,
                  transition: 'all 0.2s ease',
                  border: isSelected
                    ? '2px solid var(--accent-cyan)'
                    : '1px solid var(--border)',
                  boxShadow: isSelected ? '0 0 20px rgba(0, 212, 255, 0.2)' : 'none',
                  background: isSelected ? 'rgba(0, 212, 255, 0.04)' : undefined,
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Departure: <strong style={{ color: 'var(--text-primary)' }}>{opt.depTimeStr}</strong>
                  </span>
                  <span
                    className="badge"
                    style={{
                      fontSize: '0.68rem',
                      background:
                        opt.verdict === 'SAFE'
                          ? 'rgba(34,197,94,0.15)'
                          : opt.verdict === 'CAUTION'
                          ? 'rgba(234,179,8,0.15)'
                          : 'rgba(239,68,68,0.15)',
                      color:
                        opt.verdict === 'SAFE'
                          ? '#4ade80'
                          : opt.verdict === 'CAUTION'
                          ? '#facc15'
                          : '#ef4444',
                    }}
                  >
                    {opt.verdict}
                  </span>
                </div>

                <h4 style={{ fontSize: '0.92rem', margin: '0 0 10px', color: isSelected ? '#38bdf8' : undefined }}>
                  {opt.title}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.78rem', marginBottom: 12 }}>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: 4 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Max Waves</div>
                    <strong className="mono">{opt.maxWaveM}m</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: 4 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Est. Diesel</div>
                    <strong className="mono" style={{ color: '#00e5c8' }}>{opt.fuelLiters} L</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: 4 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Roundtrip</div>
                    <strong className="mono">{opt.hours} hrs</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: 4 }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Distance</div>
                    <strong className="mono">{opt.distNm} NM</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                  {opt.reasons[0]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Waypoint Legs Breakdown */}
      <div className="card-glass" style={{ padding: 22 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: '0.96rem', margin: 0 }}>
              3. Segmented Route Timeline: {selectedOpt.title}
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Atmospheric &amp; wave conditions sampled at the exact estimated arrival time for each leg
            </p>
          </div>
          <span className="badge badge-cyan mono">Route: {selectedOpt.route}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {selectedOpt.legs.map((leg, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border)',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'rgba(0, 212, 255, 0.15)',
                    color: '#38bdf8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  {idx + 1}
                </span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{leg.name}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Segment Distance: {leg.distNm} NM
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 18, alignItems: 'center', fontSize: '0.78rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Wave: </span>
                  <strong className="mono">{leg.waveM}m</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Wind: </span>
                  <strong className="mono">{leg.windKmph} km/h</strong>
                </div>
                <span
                  className="badge"
                  style={{
                    fontSize: '0.68rem',
                    background:
                      leg.hazard === 'LOW'
                        ? 'rgba(34,197,94,0.15)'
                        : leg.hazard === 'MODERATE'
                        ? 'rgba(234,179,8,0.15)'
                        : 'rgba(239,68,68,0.15)',
                    color:
                      leg.hazard === 'LOW'
                        ? '#4ade80'
                        : leg.hazard === 'MODERATE'
                        ? '#facc15'
                        : '#ef4444',
                  }}
                >
                  {leg.hazard} EXPOSURE
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <EvidenceModal
        isOpen={evidenceModalOpen}
        onClose={() => setEvidenceModalOpen(false)}
        data={currentDecision}
      />

      <AuthorityBriefingModal
        isOpen={briefingModalOpen}
        onClose={() => setBriefingModalOpen(false)}
        briefingData={{
          id: `ORCA-VOYAGE-${Date.now().toString().slice(-4)}`,
          location: `${originPort} to ${destination}`,
          verdict: selectedOpt.verdict,
          riskScore: selectedOpt.riskScore,
          vesselName: VESSEL_PROFILES[vesselType]?.name,
          summary: `Selected option '${selectedOpt.title}' requires ${selectedOpt.fuelLiters}L diesel across ${selectedOpt.hours} hours roundtrip. Peak wave exposure is ${selectedOpt.maxWaveM}m.`,
          evidence: selectedOpt.reasons,
        }}
      />
    </div>
  );
}
