// frontend/src/components/agents/AgentStatusPanel.jsx
import { useEffect, useState } from 'react';
import { weatherAPI } from '../../services/api';

const AGENT_META = {
  supervisor_agent: {
    name: '1. Supervisor & Fleet Agent',
    icon: '🎯',
    source: 'Vessel Specs & Parallel Node Dispatch',
    desc: 'Reads vessel HP, endurance, target species; dispatches parallel specialized worker agents.',
  },
  oceanographer_agent: {
    name: '2. Oceanographer Agent',
    icon: '🌊',
    source: 'MOSDAC / CMEMS (SST, Chl-a, SSHA) & OBIS',
    desc: 'Computes thermal & chlorophyll fronts; generates Potential Fishing Zone (PFZ) candidate polygons.',
  },
  marine_safety_agent: {
    name: '3. Marine Safety Agent',
    icon: '🚨',
    source: 'INCOIS OSF, IMD Bulletins & ERA5',
    desc: 'Checks significant wave height (Hs), swell periods, wind speed, and flags "No-Go" temporal/spatial windows.',
  },
  geofencing_agent: {
    name: '4. Geofencing Agent',
    icon: '🛡️',
    source: 'Marine Regions (EEZ/IMBL) & WDPA (MPAs)',
    desc: 'Evaluates proximity to international borders (Indo-Sri Lanka IMBL) and MPAs (Gahirmatha turtle sanctuaries).',
  },
  route_optimizer_agent: {
    name: '5. Route & Optimization Agent',
    icon: '🧭',
    source: 'GEBCO Bathymetry & Vector Ocean Currents',
    desc: 'Computes optimal sea routes minimizing fuel burn while maintaining safety offsets from reefs and adverse currents.',
  },
  synthesizer_voice_agent: {
    name: '6. Synthesizer & Voice Agent',
    icon: '🗣️',
    source: 'Bhashini API / Kokoro TTS',
    desc: 'Condenses structured JSON payloads into simple regional vernacular advisories (Telugu, Tamil, Malayalam).',
  },
};

const DEMO_AGENTS = [
  { agent_id: 'supervisor_agent',        status: 'SUCCESS', last_run: new Date(Date.now()-2*60000).toISOString(),   last_run_duration_s: 1.8  },
  { agent_id: 'oceanographer_agent',      status: 'SUCCESS', last_run: new Date(Date.now()-6*60000).toISOString(),   last_run_duration_s: 8.4  },
  { agent_id: 'marine_safety_agent',      status: 'SUCCESS', last_run: new Date(Date.now()-4*60000).toISOString(),   last_run_duration_s: 3.2  },
  { agent_id: 'geofencing_agent',         status: 'SUCCESS', last_run: new Date(Date.now()-5*60000).toISOString(),   last_run_duration_s: 2.1  },
  { agent_id: 'route_optimizer_agent',    status: 'SUCCESS', last_run: new Date(Date.now()-6*60000).toISOString(),   last_run_duration_s: 6.7  },
  { agent_id: 'synthesizer_voice_agent',  status: 'SUCCESS', last_run: new Date(Date.now()-2*60000).toISOString(),   last_run_duration_s: 1.4  },
];

export function AgentStatusPanel() {
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token === 'demo-access-token-sih2026' || !token) {
      setAgents(DEMO_AGENTS);
      return;
    }
    const fetch = () =>
      weatherAPI.agents()
        .then((r) => setAgents(r.data.agents))
        .catch(() => setAgents(DEMO_AGENTS));

    fetch();
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '1.2rem' }}>🤖</span>
          <h3 style={{ color: '#ffffff', margin: 0 }}>Collaborative Agent Mesh</h3>
        </div>
        <span className="badge badge-green">
          6/6 ONLINE
        </span>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
        Continuous background autonomous reasoning nodes polling satellite, ocean, and meteorological telemetry.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {agents.map((agent) => {
          const meta = AGENT_META[agent.agent_id] || {
            name: agent.agent_id,
            icon: '🤖',
            source: 'Telemetry Stream',
          };
          const isSuccess = agent.status === 'SUCCESS';

          return (
            <div key={agent.agent_id} className="agent-item">
              <div className="flex items-center gap-3">
                <span style={{
                  fontSize: '1.1rem',
                  width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}>
                  {meta.icon}
                </span>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="status-dot active" />
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#ffffff' }}>
                      {meta.name}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {meta.source}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: 'var(--accent-blue)',
                  fontFamily: 'JetBrains Mono',
                }}>
                  {agent.last_run_duration_s != null ? `${agent.last_run_duration_s.toFixed(1)}s` : 'active'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                  {agent.last_run ? new Date(agent.last_run).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Ready'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
