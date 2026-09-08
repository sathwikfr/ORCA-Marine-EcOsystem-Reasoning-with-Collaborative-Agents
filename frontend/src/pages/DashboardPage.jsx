// frontend/src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { AlertCard } from '../components/alerts/AlertCard';
import { AgentStatusPanel } from '../components/agents/AgentStatusPanel';
import { alertsAPI } from '../services/api';
import { useAlertStore } from '../store/alertStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { ALERT_LEVELS, DEMO_ALERTS } from '../utils/constants';

function StatCard({ icon, value, label, color, glow, badge, sub }) {
  return (
    <div className="stat-card" style={{ '--accent-glow': glow }}>
      <div>
        <div className="stat-card-top">
          <div
            className="stat-icon-wrapper"
            style={{ color, borderColor: `${color}40`, background: `${color}15` }}
          >
            {icon}
          </div>
          {badge && (
            <span style={{
              fontSize: '0.68rem', fontWeight: 700, padding: '3px 8px', borderRadius: 20,
              color, background: `${color}15`, border: `1px solid ${color}35`,
              fontFamily: 'JetBrains Mono', letterSpacing: '0.04em',
            }}>
              {badge}
            </span>
          )}
        </div>
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
      {sub && (
        <div className="stat-footer">
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{sub}</span>
          <span style={{ fontSize: '0.74rem', color, fontWeight: 600 }}>Live Feed</span>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  useWebSocket();   // Connect WebSocket on dashboard mount

  const { alerts, setAlerts, updateAlert } = useAlertStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    // Demo mode: load demo alerts immediately
    if (token === 'demo-access-token-sih2026' || !token) {
      setAlerts(DEMO_ALERTS);
      setLoading(false);
      return;
    }
    alertsAPI.list({ is_active: true, per_page: 50 })
      .then((r) => setAlerts(r.data.alerts))
      .catch(() => { setAlerts(DEMO_ALERTS); })  // fallback to demo on error
      .finally(() => setLoading(false));
  }, []);

  const handleAcknowledge = async (alertId) => {
    // Demo mode: acknowledge locally
    if (localStorage.getItem('access_token') === 'demo-access-token-sih2026' || !localStorage.getItem('access_token')) {
      updateAlert(alertId, { acknowledged_at: new Date().toISOString() });
      return;
    }
    try {
      const { data } = await alertsAPI.acknowledge(alertId);
      updateAlert(alertId, { acknowledged_at: data.acknowledged_at });
    } catch (e) {
      console.error(e);
    }
  };

  const byLevel = {
    RED:    alerts.filter((a) => a.alert_level === 'RED'    && a.is_active),
    ORANGE: alerts.filter((a) => a.alert_level === 'ORANGE' && a.is_active),
    YELLOW: alerts.filter((a) => a.alert_level === 'YELLOW' && a.is_active),
    GREEN:  alerts.filter((a) => a.alert_level === 'GREEN'  && a.is_active),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {/* Page header */}
      <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div className="flex items-center gap-3">
            <h1>Marine Operations Dashboard</h1>
            <span className="badge badge-red pulse">LIVE OPS</span>
          </div>
          <p style={{ marginTop: 4 }}>
            Real-time multi-agent disaster detection & explainable decision reasoning across Indian coastal waters
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div style={{
            fontSize: '0.78rem', color: 'var(--text-secondary)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            padding: '7px 16px', borderRadius: 20,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span className="status-dot active" />
            <span>Telemetry: <strong style={{ color: '#ffffff' }}>SYNCHRONIZED</strong></span>
          </div>

          <button
            className="btn btn-ghost"
            style={{ padding: '7px 16px', fontSize: '0.8rem' }}
            onClick={() => setAlerts(DEMO_ALERTS)}
          >
            🔄 Reset Live Scenario
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid">
        <StatCard
          icon="🚨"
          value={byLevel.RED.length}
          label="Critical Alerts"
          color="var(--alert-red)"
          badge="Urgent Response"
          sub="Bay of Bengal Central"
          glow="rgba(239, 68, 68, 0.9)"
        />
        <StatCard
          icon="⚠️"
          value={byLevel.ORANGE.length}
          label="Warnings"
          color="var(--alert-orange)"
          badge="Advisory Active"
          sub="Kerala Coast (HAB)"
          glow="rgba(249, 115, 22, 0.9)"
        />
        <StatCard
          icon="ℹ️"
          value={byLevel.YELLOW.length}
          label="Advisories"
          color="var(--alert-yellow)"
          badge="Watch Active"
          sub="Arabian Sea (Oil Signature)"
          glow="rgba(245, 158, 11, 0.9)"
        />
        <StatCard
          icon="🌐"
          value={alerts.filter((a) => a.is_active).length}
          label="Active Alerts"
          color="var(--accent-blue)"
          badge="8 Zones Tracked"
          sub="Multi-Agent Mesh Active"
          glow="rgba(0, 212, 255, 0.9)"
        />
      </div>

      {/* Main content */}
      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Alert feed */}
        <div>
          <h3 style={{ marginBottom: 16 }}>
            🚨 Live Alert Feed
            {loading && <span className="spinner" style={{ marginLeft: 8, display: 'inline-block' }} />}
          </h3>
          <div className="alert-feed">
            {alerts.length === 0 && !loading && (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                <h4>All Clear</h4>
                <p>No active alerts. All marine zones nominal.</p>
              </div>
            )}
            {alerts
              .filter((a) => a.is_active)
              .sort((a, b) => {
                const order = { RED: 0, ORANGE: 1, YELLOW: 2, GREEN: 3 };
                return (order[a.alert_level] ?? 4) - (order[b.alert_level] ?? 4);
              })
              .slice(0, 10)
              .map((alert) => (
                <AlertCard
                  key={alert.alert_id}
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                />
              ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AgentStatusPanel />

          {/* Risk level summary */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '1.2rem' }}>📊</span>
                <h3 style={{ color: '#ffffff', margin: 0 }}>Hazard Distribution</h3>
              </div>
              <span style={{
                fontSize: '0.72rem', color: 'var(--text-muted)',
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                padding: '3px 8px', borderRadius: 12,
              }}>
                8 Zones Total
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(ALERT_LEVELS).reverse().map(([level, cfg]) => {
                const count = byLevel[level]?.length || 0;
                const total = Math.max(alerts.filter((a) => a.is_active).length, 1);
                const pct = Math.round((count / total) * 100);

                return (
                  <div key={level} style={{
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                    borderRadius: 8,
                  }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                      <span className={`badge badge-${level.toLowerCase()}`}>{cfg.label}</span>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{pct}%</span>
                        <span style={{
                          fontSize: '0.82rem', fontWeight: 700, color: cfg.color,
                          fontFamily: 'JetBrains Mono',
                        }}>
                          {count}
                        </span>
                      </div>
                    </div>

                    <div style={{
                      width: '100%', height: 6,
                      background: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: 3, overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: cfg.color,
                        borderRadius: 3,
                        boxShadow: `0 0 10px ${cfg.color}`,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
