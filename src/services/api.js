import axios from 'axios';

const TOKEN_KEY = 'campusshield_token';

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } },
};

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      tokenStore.clear();
      window.dispatchEvent(new Event('campusshield:logout'));
    }
    return Promise.reject(err);
  }
);

/** Human-readable error message from an axios error */
export const errMsg = (err, fallback = 'Something went wrong') =>
  err?.response?.data?.message || (err?.code === 'ECONNABORTED' ? 'Request timed out' : err?.message) || fallback;

/** Field errors object { field: message } */
export const fieldErrors = (err) => err?.response?.data?.errors || {};

/* ---------- Endpoint helpers ---------- */
const data = (p) => p.then((r) => r.data);

export const AuthAPI = {
  login: (body) => data(api.post('/auth/login', body)),
  register: (body) => data(api.post('/auth/register', body)),
  me: () => data(api.get('/auth/me')),
  update: (body) => data(api.put('/auth/me', body)),
  password: (body) => data(api.put('/auth/me/password', body)),
  departments: () => data(api.get('/auth/departments')),
};

export const ContactAPI = {
  list: () => data(api.get('/contacts')),
  create: (body) => data(api.post('/contacts', body)),
  update: (id, body) => data(api.put(`/contacts/${id}`, body)),
  remove: (id) => data(api.delete(`/contacts/${id}`)),
  relationships: () => data(api.get('/contacts/relationships')),
};

export const CategoryAPI = {
  list: (all = false) => data(api.get('/categories', { params: all ? { all: 'true' } : {} })),
  icons: () => data(api.get('/categories/icons')),
  create: (body) => data(api.post('/categories', body)),
  update: (id, body) => data(api.put(`/categories/${id}`, body)),
  remove: (id) => data(api.delete(`/categories/${id}`)),
};

export const IncidentAPI = {
  list: (params) => data(api.get('/incidents', { params })),
  get: (id) => data(api.get(`/incidents/${id}`)),
  create: (body) => data(api.post('/incidents', body)),
  analyze: (body) => data(api.post('/incidents/analyze', body)),
  status: (id, body) => data(api.patch(`/incidents/${id}/status`, body)),
  priority: (id, body) => data(api.patch(`/incidents/${id}/priority`, body)),
  assign: (id, body) => data(api.patch(`/incidents/${id}/assign`, body)),
  map: (params) => data(api.get('/incidents/map', { params })),
  runEscalations: () => data(api.post('/incidents/escalations/run')),
  recentEscalations: () => data(api.get('/incidents/escalations/recent')),
};

export const AnalyticsAPI = {
  summary: (params) => data(api.get('/analytics/summary', { params })),
  me: () => data(api.get('/analytics/me')),
};

export const NotificationAPI = {
  list: (params) => data(api.get('/notifications', { params })),
  unread: () => data(api.get('/notifications/unread-count')),
  read: (id) => data(api.patch(`/notifications/${id}/read`)),
  readAll: () => data(api.patch('/notifications/read-all')),
};

export const UserAPI = {
  list: (params) => data(api.get('/users', { params })),
  officers: () => data(api.get('/users/officers')),
  create: (body) => data(api.post('/users', body)),
  update: (id, body) => data(api.put(`/users/${id}`, body)),
  remove: (id) => data(api.delete(`/users/${id}`)),
};

export const AdminAPI = {
  activity: (params) => data(api.get('/admin/activity', { params })),
  settings: () => data(api.get('/admin/settings')),
  saveSettings: (body) => data(api.put('/admin/settings', body)),
  publicSettings: () => data(api.get('/settings/public')),
};

export default api;
