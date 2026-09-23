// frontend/src/components/imd/ImdWarningPanel.jsx
// Premium IMD Hyderabad Live Meteorological Intelligence Component for ORCA

import { useState, useEffect, useCallback, useMemo } from 'react';
import { imdApi, IMD_POLL_MS } from '../../services/imdApi';
import './ImdWarningPanel.css';

const FORECAST_DAYS = [
  { id: 'Day_1', label: 'Day 1 (Today)' },
  { id: 'Day_2', label: 'Day 2 (Tomorrow)' },
  { id: 'Day_3', label: 'Day 3' },
  { id: 'Day_4', label: 'Day 4' },
  { id: 'Day_5', label: 'Day 5' },
];

export function ImdWarningPanel({ defaultExpanded = true, showNowcastStrip = true }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedDay, setSelectedDay] = useState('Day_1');
  const [coastalOnly, setCoastalOnly] = useState(true);
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [nowcastData, setNowcastData] = useState(null);
  const [districtsData, setDistrictsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch nowcast data
  const fetchNowcast = useCallback(async () => {
    try {
      const res = await imdApi.nowcast();
      if (res.data) {
        setNowcastData(res.data);
      }
    } catch (err) {
      console.warn('Failed to load IMD nowcast:', err);
    }
  }, []);

  // Fetch district warnings for selected day and coastal filter
  const fetchDistricts = useCallback(async (day, coastal) => {
    try {
      const res = await imdApi.districts(day, coastal);
      if (res.data) {
        setDistrictsData(res.data);
      }
    } catch (err) {
      console.warn('Failed to load IMD district warnings:', err);
      setError('Unable to reach IMD Hyderabad feed. Serving cached or fallback state.');
    }
  }, []);

  // Combined fetch handler
  const loadAllData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    await Promise.allSettled([
      fetchNowcast(),
      fetchDistricts(selectedDay, coastalOnly),
    ]);

    setLoading(false);
    setRefreshing(false);
  }, [fetchNowcast, fetchDistricts, selectedDay, coastalOnly]);

  // Initial load and polling interval
  useEffect(() => {
    loadAllData();
    const timer = setInterval(() => {
      loadAllData();
    }, IMD_POLL_MS);

    return () => clearInterval(timer);
  }, [loadAllData]);

  // Refetch districts whenever day or coastal filter changes
  useEffect(() => {
    fetchDistricts(selectedDay, coastalOnly);
  }, [selectedDay, coastalOnly, fetchDistricts]);

  // Compute filtered district rows
  const filteredDistricts = useMemo(() => {
    if (!districtsData || !districtsData.districts) return [];

    let list = districtsData.districts;

    if (levelFilter !== 'ALL') {
      list = list.filter((d) => d.warning_level === levelFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((d) =>
        d.district.toLowerCase().includes(q) ||
        (d.warnings && d.warnings.some((w) => w.toLowerCase().includes(q)))
      );
    }

    return list;
  }, [districtsData, levelFilter, searchQuery]);

  // Check if any severe warnings are active
  const hasSevereWarnings = useMemo(() => {
    if (!districtsData?.summary?.by_level) return false;
    return (districtsData.summary.by_level.WARNING || 0) > 0;
  }, [districtsData]);

  const summary = districtsData?.summary?.by_level || {
    WARNING: 0,
    ALERT: 0,
    WATCH: 0,
    NO_WARNING: 0,
  };

  const isStale = districtsData?.stale || nowcastData?.stale;
  const lastUpdated = districtsData?.last_scraped_ist || nowcastData?.last_scraped_ist || 'Live';

  return (
    <div className={`imd-panel ${hasSevereWarnings ? 'imd-panel--warning-active' : ''}`}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="imd-header">
        <div className="imd-header-left" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="imd-emblem">📡</div>
          <div className="imd-title-wrap">
            <h3 className="imd-title">
              IMD Hyderabad — Coastal Weather Intelligence
              <span className={`imd-live-indicator ${isStale ? 'stale' : 'live'}`}>
                <span className="pulse-dot" />
                {isStale ? '⚠️ Stale Data' : 'LIVE'}
              </span>
            </h3>
            <div className="imd-subtitle">
              <span>Met Centre Hyderabad Official Bulletin</span>
              <span>•</span>
              <span>Updated: {lastUpdated}</span>
            </div>
          </div>
        </div>

        <div className="imd-header-actions">
          <button
            className={`imd-btn-icon ${refreshing ? 'spinning' : ''}`}
            onClick={() => loadAllData(true)}
            title="Refresh IMD Weather Feed"
            aria-label="Refresh"
            disabled={refreshing}
          >
            🔄
          </button>
          <button
            className="imd-btn-icon"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}
            aria-label="Toggle Expand"
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* ── Collapsible Body ───────────────────────────────────── */}
      {isExpanded && (
        <>
          {/* Summary counters & District search bar */}
          <div className="imd-summary-bar">
            <div className="imd-counters">
              <span
                className={`imd-count-pill red ${levelFilter === 'WARNING' ? 'active' : ''}`}
                onClick={() => setLevelFilter(levelFilter === 'WARNING' ? 'ALL' : 'WARNING')}
                title="Filter Warning / Red"
              >
                🔴 {summary.WARNING || 0} RED WARNING
              </span>
              <span
                className={`imd-count-pill orange ${levelFilter === 'ALERT' ? 'active' : ''}`}
                onClick={() => setLevelFilter(levelFilter === 'ALERT' ? 'ALL' : 'ALERT')}
                title="Filter Alert / Orange"
              >
                🟠 {summary.ALERT || 0} ORANGE ALERT
              </span>
              <span
                className={`imd-count-pill yellow ${levelFilter === 'WATCH' ? 'active' : ''}`}
                onClick={() => setLevelFilter(levelFilter === 'WATCH' ? 'ALL' : 'WATCH')}
                title="Filter Watch / Yellow"
              >
                🟡 {summary.WATCH || 0} YELLOW WATCH
              </span>
              <span
                className={`imd-count-pill green ${levelFilter === 'NO_WARNING' ? 'active' : ''}`}
                onClick={() => setLevelFilter(levelFilter === 'NO_WARNING' ? 'ALL' : 'NO_WARNING')}
                title="Filter No Warning / Green"
              >
                🟢 {summary.NO_WARNING || 0} CLEAR
              </span>
              {levelFilter !== 'ALL' && (
                <button
                  className="imd-day-btn"
                  style={{ fontSize: '0.7rem', padding: '3px 8px' }}
                  onClick={() => setLevelFilter('ALL')}
                >
                  Clear Filter
                </button>
              )}
            </div>

            <input
              type="text"
              className="imd-search-input"
              placeholder="🔍 Search district or hazard..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Station-Level Nowcast Horizontal Strip */}
          {showNowcastStrip && nowcastData?.stations && nowcastData.stations.length > 0 && (
            <div className="imd-nowcast-section">
              <div className="imd-section-title">
                <span>⚡ Live Station Nowcast ({nowcastData.stations.length} Monitoring Stations)</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Horizontal scroll for radar stations ➔
                </span>
              </div>
              <div className="imd-nowcast-strip">
                {nowcastData.stations.map((st, idx) => (
                  <div
                    key={`${st.station}-${idx}`}
                    className={`imd-station-card alert-${st.marker_color}`}
                  >
                    <div className="imd-station-header">
                      <span className="imd-station-name" title={st.station}>
                        {st.station}
                      </span>
                      <span className={`imd-station-marker ${st.marker_color}`} />
                    </div>
                    <div className="imd-station-detail">
                      {st.rain_intensity || st.warning_label || 'Current monitoring nominal'}
                    </div>
                    {st.wind_desc && (
                      <div className="imd-station-meta">💨 {st.wind_desc}</div>
                    )}
                    {st.valid_until && (
                      <div className="imd-station-meta">⏳ {st.valid_until}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5-Day Forecast Navigator & Scope Toggle */}
          <div className="imd-day-nav">
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              FORECAST HORIZON:
            </span>
            {FORECAST_DAYS.map((day) => (
              <button
                key={day.id}
                className={`imd-day-btn ${selectedDay === day.id ? 'active' : ''}`}
                onClick={() => setSelectedDay(day.id)}
              >
                {day.label}
              </button>
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className={`imd-day-btn ${coastalOnly ? 'active' : ''}`}
                onClick={() => setCoastalOnly(!coastalOnly)}
                title="Toggle between coastal/marine districts and all regional districts"
              >
                🌊 {coastalOnly ? 'Coastal Marine Only (33)' : 'All Regional Districts'}
              </button>
            </div>
          </div>

          {/* District Warnings Table */}
          <div className="imd-table-wrap">
            <table className="imd-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>District</th>
                  <th style={{ width: '18%' }}>Warning Level</th>
                  <th style={{ width: '45%' }}>Phenomena & Hazards</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Issued</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '30px' }}>
                      <span className="spinner" style={{ display: 'inline-block', marginRight: 8 }} />
                      Loading live IMD telemetry...
                    </td>
                  </tr>
                )}

                {!loading && filteredDistricts.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '30px' }}>
                      No districts match the selected criteria.
                    </td>
                  </tr>
                )}

                {!loading &&
                  filteredDistricts.map((d, index) => {
                    const rowClass =
                      d.warning_level === 'WARNING'
                        ? 'severe-row'
                        : d.warning_level === 'ALERT'
                        ? 'alert-row'
                        : '';

                    return (
                      <tr key={`${d.district}-${index}`} className={rowClass}>
                        <td>
                          <div className="imd-district-cell">
                            <span>{d.district}</span>
                            {d.is_coastal && <span className="imd-coastal-tag">Coast</span>}
                          </div>
                        </td>
                        <td>
                          <span className={`imd-badge ${d.badge}`}>
                            {d.badge === 'red' && '🔴'}
                            {d.badge === 'orange' && '🟠'}
                            {d.badge === 'yellow' && '🟡'}
                            {d.badge === 'green' && '🟢'}
                            {d.warning_label}
                          </span>
                        </td>
                        <td>
                          <div className="imd-warning-text">
                            {d.warnings && d.warnings.length > 0 ? (
                              d.warnings.map((w, wIdx) => (
                                <div key={wIdx}>• {w}</div>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>
                                No adverse weather warnings active for this forecast day.
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: '0.72rem' }}>
                          {d.updated_on || 'Current'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Footer with IMD Attribution & Transparency */}
          <div className="imd-footer">
            <div>
              Source: <strong>India Meteorological Department</strong> — Meteorological Centre, Hyderabad
              {' '}(<a href="https://mausam.imd.gov.in/hyderabad/" target="_blank" rel="noopener noreferrer">mausam.imd.gov.in</a>)
            </div>
            <div>
              Telemetry: Live HTML/JS Scraped Feed · Auto-refreshes every 5 mins
            </div>
          </div>
        </>
      )}
    </div>
  );
}
export default ImdWarningPanel;
