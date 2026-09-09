// frontend/src/components/common/EvidenceModal.jsx
// Transparency Inspector: Displays the deterministic evidence chain, thresholds, and data sources

export function EvidenceModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 11, 20, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="card-glass"
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 28,
          border: '1px solid rgba(0, 212, 255, 0.3)',
          boxShadow: '0 0 35px rgba(0, 212, 255, 0.15)',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '1.5rem' }}>🔬</span>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Deterministic Evidence Inspector</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Audit trail, mathematical thresholds, and data origin verification
              </p>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 12px' }}>
            ✕ Close
          </button>
        </div>

        {/* Verdict Banner */}
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 8,
            marginBottom: 20,
            background:
              data.verdict === 'SAFE'
                ? 'rgba(34, 197, 94, 0.12)'
                : data.verdict === 'CAUTION'
                ? 'rgba(234, 179, 8, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${
              data.verdict === 'SAFE'
                ? 'rgba(34, 197, 94, 0.35)'
                : data.verdict === 'CAUTION'
                ? 'rgba(234, 179, 8, 0.35)'
                : 'rgba(239, 68, 68, 0.35)'
            }`,
          }}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Deterministic Verdict: {data.verdict}
            </span>
            <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Risk Index: {data.riskScore ?? 'N/A'}
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', marginTop: 6, color: 'var(--text-secondary)' }}>
            {data.summary}
          </p>
        </div>

        {/* Observations Table */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: '0.92rem', marginBottom: 10 }}>1. Data Observations & Categorization</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 6px' }}>Parameter</th>
                  <th style={{ padding: '8px 6px' }}>Value</th>
                  <th style={{ padding: '8px 6px' }}>Category</th>
                  <th style={{ padding: '8px 6px' }}>Source Feed</th>
                </tr>
              </thead>
              <tbody>
                {(data.observations || []).map((obs, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 600 }}>{obs.label || obs.param}</td>
                    <td style={{ padding: '8px 6px' }} className="mono">
                      {obs.value} {obs.unit}
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: '0.7rem',
                          background:
                            obs.category === 'OBSERVED'
                              ? 'rgba(34,197,94,0.15)'
                              : obs.category === 'FORECAST'
                              ? 'rgba(0,212,255,0.15)'
                              : 'rgba(234,179,8,0.15)',
                          color:
                            obs.category === 'OBSERVED'
                              ? '#4ade80'
                              : obs.category === 'FORECAST'
                              ? '#38bdf8'
                              : '#facc15',
                        }}
                      >
                        [{obs.category}]
                      </span>
                    </td>
                    <td style={{ padding: '8px 6px', color: 'var(--text-muted)' }}>{obs.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Physical Rule Violations */}
        {data.violations && data.violations.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.92rem', marginBottom: 10, color: '#f87171' }}>
              2. Physics & Operating Envelope Violations
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.violations.map((v, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 6,
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontSize: '0.78rem',
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <span className="mono" style={{ fontWeight: 700, color: '#ef4444' }}>
                      [{v.code}] {v.param}
                    </span>
                    <span className="badge badge-red">{v.severity}</span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{v.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence Chain */}
        {data.evidence && data.evidence.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.92rem', marginBottom: 8 }}>3. Supporting Evidence Trace</h3>
            <ul style={{ paddingLeft: 18, fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              {data.evidence.map((item, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ textAlign: 'right', marginTop: 24 }}>
          <button className="btn btn-primary" onClick={onClose} style={{ padding: '8px 22px' }}>
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
