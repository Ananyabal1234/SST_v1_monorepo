import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT, ENDPOINTS } from '../config/api';

// ---------------------------------------------------------------------------
//  Axios instance. Token is injected automatically from localStorage.
// ---------------------------------------------------------------------------
const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Log every outgoing request (skip the silent refresh retry noise).
  if (!config._retry) {
    console.log(
      `%c[API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`,
      'color:#2563eb;font-weight:bold',
      config.data ?? ''
    );
  }
  return config;
});

// ---------------------------------------------------------------------------
//  Auto-refresh on 401. When the access token expires, we call /auth/refresh
//  with the stored refresh token, update storage, and retry the original
//  request once. Avoids bouncing the user to login on every expiry.
// ---------------------------------------------------------------------------
let isRefreshing = false;
let pendingQueue = [];

function flushQueue(error) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  pendingQueue = [];
}

client.interceptors.response.use(
  (response) => {
    // Log every successful response.
    console.log(
      `%c[API RESPONSE] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`,
      'color:#16a34a;font-weight:bold',
      response.data
    );
    return response;
  },
  async (error) => {
    const original = error.config;
    // Only attempt refresh once per request and only on 401.
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        // Another refresh is in flight — wait for it, then retry.
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        })
          .then(() => {
            original._retry = true;
            const token = localStorage.getItem('auth_token');
            if (token) original.headers.Authorization = `Bearer ${token}`;
            return client(original);
          })
          .catch(() => Promise.reject(error));
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('auth_refresh_token');
      try {
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await client.post(
          ENDPOINTS.REFRESH,
          { refreshToken }
        );
        localStorage.setItem('auth_token', data.accessToken);
        localStorage.setItem('auth_refresh_token', data.refreshToken);
        flushQueue(null);
        const token = localStorage.getItem('auth_token');
        if (token) original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      } catch (refreshErr) {
        flushQueue(refreshErr);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_email');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    // Log non-401 errors (4xx/5xx that aren't auto-refreshed).
    console.log(
      `%c[API ERROR] ${error.response?.status || ''} ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
      'color:#dc2626;font-weight:bold',
      error.response?.data ?? error.message
    );
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
//  Generic helpers. Every screen calls these so swapping to the real backend
//  is a single-file change (see config/api.js).
// ---------------------------------------------------------------------------

// Endpoints wired to the Nest API. Non-live paths return empty safe shapes
// (no sample/mock rows) until real backend routes exist.
const LIVE_ENDPOINTS = [
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/refresh',
  '/api/v1/auth/me',
  '/api/v1/dashboard',
  '/api/v1/requirements',
  '/api/v1/master-data/job-families',
  '/api/v1/master-data/clients',
  '/api/v1/master-data/sales-members',
  '/api/v1/master-data/ta-members',
  '/api/v1/master-data/candidate-status',
  '/api/v1/master-data/lookups',
  '/api/v1/candidates',
  '/api/v1/users',
  '/api/v1/offers',
  '/api/v1/onboardings',
];

function isLiveEndpoint(endpoint) {
  return LIVE_ENDPOINTS.some((e) => endpoint.includes(e));
}

/** Empty responses for screens that still lack Nest routes. */
function emptySafeResponse(endpoint) {
  if (endpoint.includes('/reports/')) {
    return { title: '', kpis: {}, rows: [] };
  }
  if (endpoint.includes('/tasks')) {
    return { tasks: [] };
  }
  if (endpoint.includes('/hr/candidates')) {
    return {
      candidates: [],
      statuses: ['Pipeline', 'Pending', 'Selected', 'Offer', 'Rejected', 'Joined'],
    };
  }
  return { ok: true, data: [] };
}

export async function post(endpoint, body) {
  if (!isLiveEndpoint(endpoint)) return emptySafeResponse(endpoint);
  const { data } = await client.post(endpoint, body);
  return data;
}

export async function put(endpoint, body) {
  if (!isLiveEndpoint(endpoint)) return emptySafeResponse(endpoint);
  const { data } = await client.put(endpoint, body);
  return data;
}

export async function patch(endpoint, body) {
  if (!isLiveEndpoint(endpoint)) return emptySafeResponse(endpoint);
  const { data } = await client.patch(endpoint, body);
  return data;
}

export async function get(endpoint) {
  if (!isLiveEndpoint(endpoint)) return emptySafeResponse(endpoint);
  const { data } = await client.get(endpoint);
  return data;
}

export async function del(endpoint) {
  if (!isLiveEndpoint(endpoint)) return emptySafeResponse(endpoint);
  const { data } = await client.delete(endpoint);
  return data;
}
