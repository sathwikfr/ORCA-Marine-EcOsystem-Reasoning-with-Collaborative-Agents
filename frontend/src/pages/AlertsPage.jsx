// frontend/src/pages/AlertsPage.jsx
// Full alert management with multi-language support + vessel SMS simulation

import { useEffect, useState } from 'react';
import { useAlertStore } from '../store/alertStore';
import { alertsAPI } from '../services/api';
import { AlertCard } from '../components/alerts/AlertCard';
import { ALERT_LEVELS, DISASTER_TYPES, DEMO_ALERTS } from '../utils/constants';

const LANGUAGES = [
  { code: 'en',  name: 'English',    flag: '🇬🇧' },
  { code: 'hi',  name: 'हिन्दी',     flag: '🇮🇳' },
  { code: 'ta',  name: 'தமிழ்',      flag: '🏳️' },
  { code: 'te',  name: 'తెలుగు',     flag: '🏳️' },
  { code: 'ml',  name: 'മലയാളം',    flag: '🏳️' },
  { code: 'kn',  name: 'ಕನ್ನಡ',     flag: '🏳️' },
];

const TRANSLATIONS = {
  en: (title, level) => `⚠️ ORCA WARNING [${level}]: ${title}. Take immediate precautions. Return to port. Contact: 1093 (Coast Guard).`,
  hi: (title, level) => `⚠️ ORCA चेतावनी [${level}]: ${title}. तत्काल सावधानी बरतें। बंदरगाह वापस लौटें। संपर्क: 1093 (तटरक्षक).`,
  ta: (title, level) => `⚠️ ORCA எச்சரிக்கை [${level}]: ${title}. உடனடி முன்னெச்சரிக்கை எடுங்கள். துறைமுகம் திரும்புங்கள். தொடர்பு: 1093.`,
  te: (title, level) => `⚠️ ORCA హెచ్చరిక [${level}]: ${title}. తక్షణ జాగ్రత్తలు తీసుకోండి. ఓడరేవుకు తిరిగి వెళ్ళండి. సంప్రదింపు: 1093.`,
  ml: (title, level) => `⚠️ ORCA മുന്നറിയിപ്പ് [${level}]: ${title}. ഉടൻ മുൻകരുതൽ എടുക്കുക. തുറമുഖത്തേക്ക് മടങ്ങുക. ബന്ധപ്പെടുക: 1093.`,
  kn: (title, level) => `⚠️ ORCA ಎಚ್ಚರಿಕೆ [${level}]: ${title}. ತಕ್ಷಣ ಮುನ್ನೆಚ್ಚರಿಕೆ ತೆಗೆದುಕೊಳ್ಳಿ. ಬಂದರಿಗೆ ಹಿಂತಿರುಗಿ. ಸಂಪರ್ಕ: 1093.`,
};

// Mock SMS log
const MOCK_SMS = [
  { id: 1, mmsi: '419001234', name: 'MV Kaveri', phone: '+91-98765-43210', status: 'DELIVERED', time: '8:18 PM', zone: 'Bay of Bengal South' },
  { id: 2, mmsi: '419005678', name: 'MV Shakti', phone: '+91-94321-87654', status: 'DELIVERED', time: '8:18 PM', zone: 'Bay of Bengal South' },
  { id: 3, mmsi: '419009012', name: 'MV Arjun',  phone: '+91-99887-65432', status: 'PENDING',   time: '8:19 PM', zone: 'Gulf of Mannar'      },
  { id: 4, mmsi: '419003456', name: 'MV Priya',  phone: '+91-97654-32109', status: 'FAILED',    time: '8:19 PM', zone: 'Arabian Sea Central' },
];

export function AlertsPage() {
  const { alerts, setAlerts, updateAlert } = useAlertStore();
  const [lang, setLang] = useState('en');
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [smsFilter, setSmsFilter] = useState('ALL');
  const [smsSent, setSmsSent] = useState(false);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token === 'demo-access-token-sih2026' || !token) {
      if (alerts.length === 0) {
        setAlerts(DEMO_ALERTS);
      }
      return;
    }
    alertsAPI.list({ per_page: 100 })
      .then((r) => setAlerts(r.data.alerts))
      .catch(() => {
        if (alerts.length === 0) setAlerts(DEMO_ALERTS);
      });
  }, []);

  const handleAcknowledge = async (alertId) => {
    updateAlert(alertId, { acknowledged_at: new Date().toISOString() });
  };

  const filtered = filter === 'ALL'
    ? alerts
    : filter === 'ACTIVE'
    ? alerts.filter((a) => a.is_active)
    : alerts.filter((a) => a.alert_level === filter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1>Alert Management</h1>
        <p>All alerts · Multi-language dispatch · SMS notification log</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', gap: 20 }}>
        {/* Left: Alert list */}
        <div>
          {/* Filter bar */}
          <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
            {['ALL', 'ACTIVE', 'RED', 'ORANGE', 'YELLOW', 'GREEN'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                background: filter === f ? 'rgba(0,212,255,0.15)' : 'var(--bg-card)',
                border: `1px solid ${filter === f ? 'var(--accent-blue)' : 'var(--border)'}`,
                borderRadius: 20, padding: '4px 14px', fontSize: '0.75rem', fontWeight: 600,
                color: filter === f ? 'var(--accent-blue)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}>
                {f}
              </button>
            ))}
          </div>

          <div className="alert-feed">
            {filtered.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <p>No alerts match this filter.</p>
              </div>
            )}
            {filtered.map((a) => (
              <div key={a.alert_id} onClick={() => setSelectedAlert(a === selectedAlert ? null : a)}
                style={{ cursor: 'pointer', outline: selectedAlert?.alert_id === a.alert_id ? '2px solid var(--accent-blue)' : 'none', borderRadius: 12 }}
              >
                <AlertCard alert={a} onAcknowledge={handleAcknowledge} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Detail + Multi-language + SMS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Multi-language panel */}
          <div className="card">
            <h3 style={{ marginBottom: 4, color: 'var(--accent-teal)' }}>🌐 Multi-Language Alert</h3>
            <p style={{ fontSize: '0.78rem', marginBottom: 14 }}>
              {selectedAlert ? `Translating: "${selectedAlert.title}"` : 'Select an alert to translate'}
            </p>

            {/* Language tabs */}
            <div className="flex gap-1 mb-3" style={{ flexWrap: 'wrap' }}>
              {LANGUAGES.map((l) => (
                <button key={l.code} onClick={() => setLang(l.code)} style={{
                  background: lang === l.code ? 'rgba(0,229,200,0.15)' : 'var(--bg-primary)',
                  border: `1px solid ${lang === l.code ? 'var(--accent-teal)' : 'var(--border)'}`,
                  borderRadius: 8, padding: '4px 10px', fontSize: '0.72rem',
                  color: lang === l.code ? 'var(--accent-teal)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}>
                  {l.flag} {l.name}
                </button>
              ))}
            </div>

            <div style={{
              background: 'var(--bg-primary)', borderRadius: 8, padding: 14,
              border: '1px solid var(--border)', fontSize: '0.875rem',
              lineHeight: 1.8, minHeight: 80, color: 'var(--text-primary)',
            }}>
              {selectedAlert
                ? TRANSLATIONS[lang]?.(selectedAlert.title, selectedAlert.alert_level) || ''
                : <span style={{ color: 'var(--text-muted)' }}>← Click an alert to see its translation</span>
              }
            </div>

            {selectedAlert && (
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
                onClick={() => { setSmsSent(true); setTimeout(() => setSmsSent(false), 3000); }}
              >
                {smsSent ? '✅ SMS Dispatched!' : `📱 Send SMS in ${LANGUAGES.find((l2) => l2.code === lang)?.name}`}
              </button>
            )}
          </div>

          {/* SMS Notification Log */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3>📱 SMS Dispatch Log</h3>
              <div className="flex gap-1">
                {['ALL', 'DELIVERED', 'PENDING', 'FAILED'].map((s) => (
                  <button key={s} onClick={() => setSmsFilter(s)} style={{
                    background: smsFilter === s ? 'rgba(0,212,255,0.1)' : 'transparent',
                    border: `1px solid ${smsFilter === s ? 'var(--accent-blue)' : 'var(--border)'}`,
                    borderRadius: 6, padding: '3px 8px', fontSize: '0.65rem',
                    color: smsFilter === s ? 'var(--accent-blue)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MOCK_SMS.filter((s) => smsFilter === 'ALL' || s.status === smsFilter).map((sms) => (
                <div key={sms.id} className="flex items-center justify-between" style={{
                  padding: '8px 12px', background: 'var(--bg-primary)',
                  borderRadius: 8, border: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{sms.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sms.zone} · {sms.phone}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: sms.status === 'DELIVERED' ? 'rgba(34,197,94,0.15)' : sms.status === 'PENDING' ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)',
                      color: sms.status === 'DELIVERED' ? '#22c55e' : sms.status === 'PENDING' ? '#eab308' : '#ef4444',
                    }}>
                      {sms.status}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{sms.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              2 delivered · 1 pending · 1 failed · Via Twilio SMS API
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
