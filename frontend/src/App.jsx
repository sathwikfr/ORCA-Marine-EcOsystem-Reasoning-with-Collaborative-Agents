// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { LoginPage }                 from './pages/LoginPage';
import { DashboardPage }             from './pages/DashboardPage';
import { MapPage }                   from './pages/MapPage';
import { ForecastPage }              from './pages/ForecastPage';
import { ChatPage }                  from './pages/ChatPage';
import { AnalyticsPage }             from './pages/AnalyticsPage';
import { AlertsPage }                from './pages/AlertsPage';
import { VoyagePlannerPage }         from './pages/VoyagePlannerPage';
import { FishingPage }               from './pages/FishingPage';
import { ScientificInvestigationPage } from './pages/ScientificInvestigationPage';

// Protected route wrapper
function Protected({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function Topbar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      {/* DefCon Alert Status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(239, 68, 68, 0.12)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: 9999, padding: '5px 14px',
        fontSize: '0.75rem', fontWeight: 700,
        color: '#f87171', letterSpacing: '0.04em',
        boxShadow: '0 0 14px rgba(239, 68, 68, 0.15)',
      }}>
        <span className="status-dot error pulse" />
        DEFCON 2 · ELEVATED MARITIME ALERT
      </div>

      <div style={{ flex: 1 }} />

      {/* Dual Clock: IST & UTC */}
      <div style={{
        display: 'flex', gap: 14, alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border)',
        borderRadius: 8, padding: '5px 14px',
        fontSize: '0.78rem',
      }} className="mono">
        <span style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--accent-blue)', fontWeight: 600, marginRight: 6 }}>IST</span>
          {time.toLocaleTimeString('en-IN', { hour12: false })}
        </span>
        <span style={{ color: 'var(--border-light)' }}>•</span>
        <span style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginRight: 6 }}>UTC</span>
          {time.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour12: false })}
        </span>
      </div>

      {/* Live Monitoring Pulse */}
      <div className="flex items-center gap-2" style={{
        fontSize: '0.78rem', color: '#38bdf8',
        background: 'rgba(0, 212, 255, 0.08)',
        border: '1px solid rgba(0, 212, 255, 0.25)',
        padding: '5px 14px', borderRadius: 20,
        fontWeight: 600,
      }}>
        <span className="status-dot active" />
        Decision Kernel Active · 8 Coastal Sectors
      </div>
    </header>
  );
}

function Sidebar() {
  const { user, logout } = useAuthStore();

  const sections = [
    {
      title: 'Voyage & Operations',
      links: [
        { to: '/',              icon: '📊', label: 'Dashboard' },
        { to: '/voyage',        icon: '🧭', label: 'What-If Planner' },
        { to: '/fishing',       icon: '🐟', label: 'Fishing & PFZ' },
        { to: '/map',           icon: '🗺️', label: 'Ocean Risk Map' },
      ],
    },
    {
      title: 'Monitoring & Safety',
      links: [
        { to: '/forecast',      icon: '📈', label: '24h Forecast' },
        { to: '/alerts',        icon: '🚨', label: 'Alert Center' },
      ],
    },
    {
      title: 'Reasoning & Intelligence',
      links: [
        { to: '/investigation', icon: '🔬', label: 'Scientific Inquest' },
        { to: '/analytics',     icon: '🧠', label: 'Marine Analytics' },
        { to: '/chat',          icon: '💬', label: 'AI Supervisor (EN/TE)' },
      ],
    },
  ];

  return (
    <nav className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div className="logo-container">
          <div className="logo-icon-badge">🌊</div>
          <div>
            <div className="logo-text">ORCA</div>
            <div style={{
              fontSize: '0.66rem', color: 'var(--accent-blue)',
              fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              Marine Intelligence · SIH26176
            </div>
          </div>
        </div>
      </div>

      {/* Categorized Nav links */}
      <div style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {sections.map((sec) => (
          <div key={sec.title} style={{ marginBottom: 14 }}>
            <div className="nav-section-title">{sec.title}</div>
            {sec.links.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span style={{ fontSize: '1.05rem' }}>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* System Telemetry Pill */}
      <div style={{
        margin: '0 16px 14px',
        padding: '12px 14px',
        background: 'rgba(0, 212, 255, 0.04)',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div className="flex items-center justify-between" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
          <span>DECISION MESH</span>
          <span style={{ color: 'var(--alert-green)' }}>● 6/6 ONLINE</span>
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          INCOIS/IMD/Copernicus Ingestion
        </div>
      </div>

      {/* User info + logout */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '16px 20px',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #00d4ff, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '0.9rem', color: '#060a13',
          }}>
            ND
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name || 'NDMA Control Officer'}
            </div>
            <div style={{
              fontSize: '0.68rem', color: 'var(--text-muted)',
              fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              {user?.role?.replace('_', ' ') || 'National Officer'}
            </div>
          </div>
        </div>

        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'center', padding: '6px 12px', fontSize: '0.78rem' }}
          onClick={logout}
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Topbar />
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <Protected><AppLayout><DashboardPage /></AppLayout></Protected>
          }
        />
        <Route
          path="/voyage"
          element={
            <Protected><AppLayout><VoyagePlannerPage /></AppLayout></Protected>
          }
        />
        <Route
          path="/fishing"
          element={
            <Protected><AppLayout><FishingPage /></AppLayout></Protected>
          }
        />
        <Route
          path="/map"
          element={
            <Protected><AppLayout><MapPage /></AppLayout></Protected>
          }
        />
        <Route
          path="/forecast"
          element={
            <Protected><AppLayout><ForecastPage /></AppLayout></Protected>
          }
        />
        <Route
          path="/alerts"
          element={
            <Protected><AppLayout><AlertsPage /></AppLayout></Protected>
          }
        />
        <Route
          path="/investigation"
          element={
            <Protected><AppLayout><ScientificInvestigationPage /></AppLayout></Protected>
          }
        />
        <Route
          path="/analytics"
          element={
            <Protected><AppLayout><AnalyticsPage /></AppLayout></Protected>
          }
        />
        <Route
          path="/chat"
          element={
            <Protected><AppLayout><ChatPage /></AppLayout></Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
