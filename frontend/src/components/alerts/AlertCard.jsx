// frontend/src/components/alerts/AlertCard.jsx
import { ALERT_LEVELS, DISASTER_TYPES } from '../../utils/constants';
import { formatDistanceToNow } from 'date-fns';

const AGENT_ICON_MAP = {
  weather_agent: { icon: '🌤️', label: 'Weather' },
  ocean_agent: { icon: '🌊', label: 'Ocean' },
  satellite_agent: { icon: '🛰️', label: 'Satellite' },
  vessel_agent: { icon: '🚢', label: 'AIS Vessel' },
  ecosystem_agent: { icon: '🪸', label: 'Ecosystem' },
  disaster_reasoning_agent: { icon: '🧠', label: 'Disaster Reasoning' },
  coordinator_agent: { icon: '🎯', label: 'Coordinator' },
};

export function AlertCard({ alert, onAcknowledge }) {
  const level = ALERT_LEVELS[alert.alert_level] || ALERT_LEVELS.GREEN;
  const dtype = DISASTER_TYPES[alert.alert_type] || DISASTER_TYPES.UNKNOWN;
  const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: true });

  // Clean explanation of ASCII dividers
  const cleanExplanation = (alert.explanation || '')
    .replace(/━+/g, '')
    .replace(/🌀 ORCA Risk Assessment/g, '')
    .trim();

  return (
    <div className={`alert-card ${alert.alert_level?.toLowerCase()}`}>
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '1.25rem',
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)', borderRadius: 8,
          }}>
            {dtype.icon}
          </span>
          <span className={`badge badge-${alert.alert_level?.toLowerCase()}`}>
            <span className="status-dot active" style={{ width: 6, height: 6 }} />
            {level.label}
          </span>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {timeAgo}
          </span>
        </div>

        <div>
          {alert.is_active && !alert.acknowledged_at && (
            <button
              className="btn btn-ghost"
              style={{
                padding: '4px 14px',
                fontSize: '0.75rem',
                borderColor: 'rgba(255,255,255,0.15)',
              }}
              onClick={() => onAcknowledge?.(alert.alert_id)}
            >
              Acknowledge
            </button>
          )}
          {alert.acknowledged_at && (
            <span style={{
              fontSize: '0.74rem',
              color: 'var(--alert-green)',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '3px 10px', borderRadius: 20,
              fontWeight: 600,
            }}>
              ✓ Acknowledged
            </span>
          )}
        </div>
      </div>

      {/* Alert Title */}
      <h4 style={{
        fontSize: '1rem',
        fontWeight: 700,
        color: '#ffffff',
        lineHeight: 1.4,
      }}>
        {alert.title}
      </h4>

      {/* Explanation snippet */}
      <p style={{
        fontSize: '0.82rem',
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        background: 'rgba(0, 0, 0, 0.2)',
        padding: '10px 14px',
        borderRadius: 8,
        border: '1px solid rgba(255, 255, 255, 0.04)',
      }}>
        {cleanExplanation.slice(0, 240)}
        {cleanExplanation.length > 240 ? '…' : ''}
      </p>

      {/* Recommended Action Pills (if any) */}
      {alert.recommended_actions?.length > 0 && (
        <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Actions:
          </span>
          {alert.recommended_actions.slice(0, 2).map((act, i) => (
            <span key={i} style={{
              fontSize: '0.72rem',
              color: 'var(--text-primary)',
              background: 'rgba(0, 212, 255, 0.08)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
              padding: '2px 8px', borderRadius: 6,
            }}>
              ⚡ {act}
            </span>
          ))}
        </div>
      )}

      {/* Confidence Bar */}
      {alert.confidence != null && (
        <div className="flex items-center gap-3 mt-1">
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            Model Confidence
          </span>
          <div style={{
            flex: 1, height: 6, background: 'rgba(255,255,255,0.06)',
            borderRadius: 3, overflow: 'hidden',
          }}>
            <div style={{
              width: `${(alert.confidence * 100).toFixed(0)}%`,
              height: '100%',
              background: level.color,
              borderRadius: 3,
              boxShadow: `0 0 10px ${level.color}`,
            }} />
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: level.color,
            fontFamily: 'JetBrains Mono',
          }}>
            {(alert.confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* Source Agents Row */}
      {alert.source_agents?.length > 0 && (
        <div className="flex items-center gap-2 mt-1" style={{ flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            Sources:
          </span>
          {alert.source_agents.map((a) => {
            const info = AGENT_ICON_MAP[a] || { icon: '🤖', label: a.replace('_agent', '') };
            return (
              <span key={a} style={{
                fontSize: '0.7rem',
                color: 'var(--text-secondary)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border)',
                padding: '2px 8px',
                borderRadius: 20,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <span>{info.icon}</span>
                <span>{info.label}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
