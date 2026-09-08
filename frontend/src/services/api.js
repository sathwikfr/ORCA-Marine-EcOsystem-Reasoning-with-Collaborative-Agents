// frontend/src/services/api.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refresh,
          });
          localStorage.setItem('access_token', data.access_token);
          orig.headers.Authorization = `Bearer ${data.access_token}`;
          return api(orig);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

// ── API methods ──────────────────────────────────────────────────────────────

const DEMO_USER = {
  user_id:   'demo-0000-0000-0000-000000000001',
  email:     'admin@orca.sih',
  full_name: 'ORCA Demo Admin',
  role:      'ndma_admin',
  region:    'Bay of Bengal',
  is_active: true,
  created_at: new Date().toISOString(),
};

const DEMO_TOKEN = 'demo-access-token-sih2026';

export const authAPI = {
  login: (data) => {
    // Demo mode bypass — works without backend
    if (data.email === 'admin@orca.sih' && data.password === 'password123') {
      return Promise.resolve({
        data: {
          access_token:  DEMO_TOKEN,
          refresh_token: 'demo-refresh-token',
          token_type:    'bearer',
          expires_in:    900,
          user:          DEMO_USER,
        },
      });
    }
    return api.post('/auth/login', data);
  },
  register: (data) => api.post('/auth/register', data),
  refresh:  (token) => api.post('/auth/refresh', { refresh_token: token }),
};

export const alertsAPI = {
  list:        (params) => api.get('/alerts', { params }),
  get:         (id)     => api.get(`/alerts/${id}`),
  acknowledge: (id, note) =>
    api.patch(`/alerts/${id}/acknowledge`, { acknowledgment_note: note }),
  resolve:     (id, note) =>
    api.patch(`/alerts/${id}/resolve`, { resolution_note: note }),
};

export const weatherAPI = {
  current: (region) => api.get('/weather/current', { params: { region } }),
  agents:  ()       => api.get('/weather/agents/status'),
};

export default api;
