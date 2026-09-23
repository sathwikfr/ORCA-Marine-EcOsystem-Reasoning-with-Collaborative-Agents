// frontend/src/services/imdApi.js
// Thin axios wrapper for the IMD weather scraper backend endpoints

import axios from 'axios';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const IMD = `${BASE}/imd`;

/** Polling interval for IMD data (5 minutes, matching backend cache TTL) */
export const IMD_POLL_MS = 5 * 60 * 1000;

export const imdApi = {
  /** Live station-level nowcast */
  nowcast: () => axios.get(`${IMD}/warnings/nowcast`),

  /** District-wise warnings for a given forecast day */
  districts: (day = 'Day_1', coastalOnly = true) =>
    axios.get(`${IMD}/warnings/districts`, { params: { day, coastal_only: coastalOnly } }),

  /** Subdivision-wise warnings */
  subdivisions: () => axios.get(`${IMD}/warnings/subdivisions`),
};
