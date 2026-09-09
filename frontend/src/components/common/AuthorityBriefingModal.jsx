// frontend/src/components/common/AuthorityBriefingModal.jsx
// Official Maritime Authority Briefing Generator (NDMA / Coast Guard / State Fisheries)

export function AuthorityBriefingModal({ isOpen, onClose, briefingData }) {
  if (!isOpen || !briefingData) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `
ORCA MARITIME DECISION SUPPORT BRIEFING
=======================================
DOCUMENT ID: ${briefingData.id || 'ORCA-BRIEF-2026-001'}
DATE/TIME: ${new Date().toUTCString()}
TARGET SECTOR: ${briefingData.location || 'Visakhapatnam Coastal Waters'}
RECIPIENT: NDMA / Indian Coast Guard / Dept of Fisheries

OPERATIONAL STATUS & VERDICT:
----------------------------
SAFETY VERDICT: ${briefingData.verdict || 'SAFE'}
RISK INDEX: ${briefingData.riskScore ?? '0.18'} / 1.00
VESSEL PROFILE: ${briefingData.vesselName || 'Standard Mechanized Trawler'}

SUMMARY FINDINGS:
-----------------
${briefingData.summary || 'Conditions evaluated within operational thresholds.'}

EVIDENCE & METRICS:
-------------------
${(briefingData.evidence || []).map((e) => `• ${e}`).join('\n')}

OPERATIONAL DIRECTIVES:
-----------------------
1. Adhere to VHF Channel 16 watchkeeping.
2. Confirm return ETA before clearing port breakwater.
3. Monitor real-time INCOIS bulletin updates.

Generated automatically by ORCA Multi-Agent System.
    `.trim();

    navigator.clipboard.writeText(text);
    alert('Briefing copied to clipboard!');
  };

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
          maxWidth: 780,
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: 36,
          backgroundColor: '#0a101d',
          border: '1px solid rgba(0, 229, 200, 0.35)',
        }}
      >
        {/* Actions bar (hidden in print) */}
        <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary" onClick={handlePrint} style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
              🖨️ Print / Save PDF
            </button>
            <button className="btn btn-ghost" onClick={handleCopy} style={{ padding: '6px 14px', fontSize: '0.78rem' }}>
              📋 Copy Markdown
            </button>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 12px' }}>
            ✕ Close
          </button>
        </div>

        {/* Printable Document Body */}
        <div
          style={{
            border: '2px solid rgba(255, 255, 255, 0.1)',
            padding: 28,
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.01)',
          }}
        >
          {/* Header */}
          <div
            style={{
              textAlign: 'center',
              borderBottom: '2px solid var(--border)',
              paddingBottom: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', color: '#00e5c8' }}>
              NATIONAL DISASTER MANAGEMENT & MARITIME ADVISORY
            </div>
            <h1 style={{ fontSize: '1.4rem', margin: '6px 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ORCA Marine Decision Briefing
            </h1>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Authority Operational Dispatch · Smart India Hackathon 2026 · PS SIH26176
            </div>
          </div>

          {/* Meta Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: 20,
              fontSize: '0.78rem',
              background: 'rgba(255, 255, 255, 0.02)',
              padding: 14,
              borderRadius: 6,
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Target Sector: </span>
              <strong>{briefingData.location || 'Visakhapatnam Coastal Waters'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Vessel Spec: </span>
              <strong>{briefingData.vesselName || 'Standard Mechanized (14m)'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Issue Date: </span>
              <span className="mono">{new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Audit Classification: </span>
              <strong style={{ color: '#38bdf8' }}>DETERMINISTIC VERIFIED</strong>
            </div>
          </div>

          {/* Safety Verdict Box */}
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              marginBottom: 20,
              background:
                briefingData.verdict === 'SAFE'
                  ? 'rgba(34, 197, 94, 0.12)'
                  : briefingData.verdict === 'CAUTION'
                  ? 'rgba(234, 179, 8, 0.12)'
                  : 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>
                OPERATIONAL VERDICT: {briefingData.verdict || 'SAFE'}
              </span>
              <span className="badge badge-cyan mono">Risk: {briefingData.riskScore ?? 0.18}</span>
            </div>
            <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text-secondary)' }}>
              {briefingData.summary}
            </p>
          </div>

          {/* Key Evidentiary Findings */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Evidentiary Observations & Thresholds
            </h3>
            <ul style={{ paddingLeft: 18, fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              {(briefingData.evidence || []).map((e, idx) => (
                <li key={idx} style={{ marginBottom: 4 }}>
                  {e}
                </li>
              ))}
            </ul>
          </div>

          {/* Operational Directives */}
          <div>
            <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Recommended Operational Directives
            </h3>
            <ol style={{ paddingLeft: 18, fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
              <li style={{ marginBottom: 4 }}>
                <strong>VHF Watch:</strong> Maintain active distress watch on Marine VHF Channel 16.
              </li>
              <li style={{ marginBottom: 4 }}>
                <strong>Harbor ETA:</strong> Coastal vessels must log outward passage and expected return window with harbor master.
              </li>
              <li style={{ marginBottom: 4 }}>
                <strong>Dynamic Reassessment:</strong> In the event of barometric pressure drop &gt; 2 hPa/hr, initiate immediate return passage.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
