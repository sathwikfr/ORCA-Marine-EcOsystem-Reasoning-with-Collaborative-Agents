// frontend/src/pages/ScientificInvestigationPage.jsx
// Scientific Investigation of Anomalies & Research Sampling Planner

import { useState } from 'react';
import { getInvestigationReport, generateCruiseSamplingPlan } from '../services/scientificEngine';
import { EvidenceModal } from '../components/common/EvidenceModal';
import { AuthorityBriefingModal } from '../components/common/AuthorityBriefingModal';

export function ScientificInvestigationPage() {
  const [selectedHypId, setSelectedHypId] = useState('HYP-UPWELLING');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(false);

  const report = getInvestigationReport({});
  const cruisePlan = generateCruiseSamplingPlan({});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="flex items-center gap-3">
            <h1 style={{ margin: 0 }}>Scientific Investigation &amp; Sampling</h1>
            <span className="badge badge-cyan">COMPETING HYPOTHESES ENGINE</span>
          </div>
          <p style={{ marginTop: 4, color: 'var(--text-muted)' }}>
            Investigate marine anomalies with evidence trees and design oceanographic survey transects
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="btn btn-ghost"
            onClick={() => setEvidenceOpen(true)}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            🔬 Inspect Evidence
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setBriefingOpen(true)}
            style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          >
            📋 Export Research Report
          </button>
        </div>
      </div>

      {/* Investigation Case Header */}
      <div
        className="card-glass"
        style={{
          padding: 22,
          border: '1px solid rgba(0, 212, 255, 0.25)',
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.04) 0%, rgba(10, 16, 29, 0.8) 100%)',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 10 }}>
          <span className="mono" style={{ fontSize: '0.74rem', color: '#00d4ff' }}>
            CASE ID: {report.investigationId} · OBSERVED ANOMALY
          </span>
          <span className="badge badge-cyan">{report.location}</span>
        </div>

        <h2 style={{ fontSize: '1.25rem', margin: '0 0 10px' }}>{report.observedAnomaly}</h2>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
          {report.summary}
        </p>
      </div>

      {/* Competing Hypotheses Grid */}
      <div>
        <h3 style={{ fontSize: '0.96rem', marginBottom: 12 }}>
          1. Competing Oceanographic Hypotheses Evaluation
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: 16,
          }}
        >
          {report.hypotheses.map((hyp) => {
            const isSelected = hyp.id === selectedHypId;
            return (
              <div
                key={hyp.id}
                className="card-glass"
                onClick={() => setSelectedHypId(hyp.id)}
                style={{
                  padding: 20,
                  cursor: 'pointer',
                  borderRadius: 10,
                  border: isSelected
                    ? '2px solid var(--accent-cyan)'
                    : '1px solid var(--border)',
                  background: isSelected ? 'rgba(0, 212, 255, 0.04)' : undefined,
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: '0.7rem',
                      background:
                        hyp.status === 'HIGHLY_PLAUSIBLE'
                          ? 'rgba(34,197,94,0.15)'
                          : hyp.status === 'UNLIKELY'
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(234,179,8,0.15)',
                      color:
                        hyp.status === 'HIGHLY_PLAUSIBLE'
                          ? '#4ade80'
                          : hyp.status === 'UNLIKELY'
                          ? '#f87171'
                          : '#facc15',
                    }}
                  >
                    {hyp.status}
                  </span>
                  <strong className="mono" style={{ fontSize: '1.1rem', color: '#38bdf8' }}>
                    {hyp.likelihood}%
                  </strong>
                </div>

                <h4 style={{ fontSize: '0.98rem', margin: '0 0 14px' }}>{hyp.title}</h4>

                {/* Supporting Evidence */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 700, marginBottom: 4 }}>
                    ✓ SUPPORTING OBSERVATIONS:
                  </div>
                  {hyp.supporting.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: '0.76rem',
                        background: 'rgba(34,197,94,0.06)',
                        padding: '6px 8px',
                        borderRadius: 4,
                        marginBottom: 4,
                      }}
                    >
                      <strong>{s.metric}: </strong> {s.observed} — <em>{s.note}</em>
                    </div>
                  ))}
                </div>

                {/* Contradicting Evidence */}
                {hyp.contradicting.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700, marginBottom: 4 }}>
                      ✗ CONTRADICTING OBSERVATIONS:
                    </div>
                    {hyp.contradicting.map((c, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: '0.76rem',
                          background: 'rgba(239,68,68,0.06)',
                          padding: '6px 8px',
                          borderRadius: 4,
                          marginBottom: 4,
                        }}
                      >
                        <strong>{c.metric}: </strong> {c.observed} — <em>{c.note}</em>
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing Data Needed */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
                    ❓ MEASUREMENTS NEEDED TO CONFIRM:
                  </div>
                  <ul style={{ paddingLeft: 16, margin: 0, fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                    {hyp.missing.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Research Sampling Plan Section */}
      <div className="card-glass" style={{ padding: 22 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: '1rem', margin: 0 }}>
              2. Recommended Research Cruise Sampling Plan
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Optimized cross-shelf transect designed to test leading hypothesis &apos;{report.favoredHypothesisId}&apos;
            </p>
          </div>
          <span className="badge badge-cyan">{cruisePlan.name}</span>
        </div>

        {/* Plan Summary Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            background: 'rgba(255, 255, 255, 0.02)',
            padding: 14,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: '0.78rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Departure Harbor: </span>
            <strong>{cruisePlan.port}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Total Stations: </span>
            <strong className="mono">{cruisePlan.totalStations} Stations</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Roundtrip Distance: </span>
            <strong className="mono" style={{ color: '#00d4ff' }}>{cruisePlan.totalDistanceNm} NM</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Expedition Duration: </span>
            <strong className="mono" style={{ color: '#4ade80' }}>{cruisePlan.estimatedHours} Hours (Feasible)</strong>
          </div>
        </div>

        {/* Stations Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px 6px' }}>Station ID</th>
                <th style={{ padding: '8px 6px' }}>Station Name</th>
                <th style={{ padding: '8px 6px' }}>Coordinates</th>
                <th style={{ padding: '8px 6px' }}>Target Depth</th>
                <th style={{ padding: '8px 6px' }}>Parameters to Sample</th>
                <th style={{ padding: '8px 6px' }}>Time Budget</th>
              </tr>
            </thead>
            <tbody>
              {cruisePlan.stations.map((stn) => (
                <tr key={stn.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 6px', fontWeight: 700, color: '#38bdf8' }} className="mono">
                    {stn.id}
                  </td>
                  <td style={{ padding: '8px 6px', fontWeight: 600 }}>{stn.name}</td>
                  <td style={{ padding: '8px 6px' }} className="mono">
                    {stn.lat}°N, {stn.lon}°E
                  </td>
                  <td style={{ padding: '8px 6px' }} className="mono">
                    {stn.depthM}m
                  </td>
                  <td style={{ padding: '8px 6px', color: 'var(--text-secondary)' }}>
                    {stn.params.join(', ')}
                  </td>
                  <td style={{ padding: '8px 6px' }} className="mono">
                    {stn.timeMins} mins
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <EvidenceModal
        isOpen={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        data={{
          verdict: 'SCIENTIFIC INQUEST COMPLETE',
          riskScore: 0.16,
          summary: report.summary,
          observations: [
            { label: 'Observed Chlorophyll-a', value: '4.8', unit: 'mg/m³', category: 'OBSERVED', source: 'Sentinel-3 OLCI' },
            { label: 'Surface Water Temp', value: '26.8', unit: '°C', category: 'OBSERVED', source: 'INSAT-3D / NOAA AVHRR' },
            { label: 'Alongshore Wind', value: '38.0', unit: 'km/h', category: 'OBSERVED', source: 'Coastal Buoy Network' },
          ],
          evidence: [
            'Alongshore wind stress induces positive Ekman upwelling velocity',
            'Subsurface cold water shoaling verified across satellite SST delta',
          ],
        }}
      />

      <AuthorityBriefingModal
        isOpen={briefingOpen}
        onClose={() => setBriefingOpen(false)}
        briefingData={{
          id: `SCI-REPORT-${Date.now().toString().slice(-4)}`,
          location: report.location,
          verdict: 'UPWELLING EVENT CONFIRMED',
          riskScore: 0.15,
          vesselName: 'ORV Sagar Nidhi / Coastal Survey Craft',
          summary: `Scientific investigation concludes high probability of wind-driven coastal upwelling event off Andhra Pradesh. 4-station cross-shelf survey scheduled.`,
          evidence: [
            '84% statistical concordance with Ekman transport models',
            'No toxic dinoflagellate contamination detected in coastal waters',
          ],
        }}
      />
    </div>
  );
}
