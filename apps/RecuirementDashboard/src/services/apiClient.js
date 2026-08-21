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

/** Endpoints that must never trigger the auto-refresh loop. */
function isAuthPassThrough(url = '') {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout')
  );
}

function clearAuthStorage() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_refresh_token');
  localStorage.removeItem('auth_email');
}

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
//
//  Uses a bare axios call (not `client`) for refresh so a 401 refresh response
//  cannot re-enter this interceptor (which previously deadlocked).
// ---------------------------------------------------------------------------
let isRefreshing = false;
let pendingQueue = [];

function flushQueue(error) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  pendingQueue = [];
}

function redirectToLogin() {
  // Hard navigation clears React auth state after a dead session.
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
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
    const original = error.config || {};
    const status = error.response?.status;
    const url = original.url || '';

    // Auth endpoints: surface the error as-is (login failed / refresh invalid).
    if (isAuthPassThrough(url)) {
      if (status === 401 && url.includes('/auth/refresh')) {
        console.warn('[auth] Refresh token rejected — session expired. Sign in again.');
        clearAuthStorage();
      }
      console.log(
        `%c[API ERROR] ${status || ''} ${original.method?.toUpperCase()} ${url}`,
        'color:#dc2626;font-weight:bold',
        error.response?.data ?? error.message
      );
      return Promise.reject(error);
    }

    // Only attempt refresh once per request and only on 401.
    if (status === 401 && !original._retry) {
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
          .catch((err) => Promise.reject(err || error));
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('auth_refresh_token');
      try {
        if (!refreshToken) throw new Error('No refresh token');

        // Bare axios — bypass this interceptor to avoid recursive refresh.
        const { data } = await axios.post(
          `${API_BASE_URL}${ENDPOINTS.REFRESH}`,
          { refreshToken },
          {
            baseURL: undefined,
            timeout: API_TIMEOUT,
            headers: { 'Content-Type': 'application/json' },
          }
        );

        localStorage.setItem('auth_token', data.accessToken);
        localStorage.setItem('auth_refresh_token', data.refreshToken);
        flushQueue(null);
        const token = localStorage.getItem('auth_token');
        if (token) original.headers.Authorization = `Bearer ${token}`;
        return client(original);
      } catch (refreshErr) {
        flushQueue(refreshErr);
        clearAuthStorage();
        redirectToLogin();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Log non-401 errors (and non-refreshable 401s).
    console.log(
      `%c[API ERROR] ${status || ''} ${original.method?.toUpperCase()} ${url}`,
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
  '/api/v1/master-data/ta-lead-members',
  '/api/v1/master-data/candidate-status',
  '/api/v1/master-data/lookups',
  '/api/v1/candidates',
  '/api/v1/users',
  '/api/v1/offers',
  '/api/v1/onboardings',
  '/api/v1/notifications',
  '/api/v1/work',
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

export function getResumeDownloadUrl(candidateId) {
  return `${ENDPOINTS.CANDIDATE_RESUME}/${candidateId}/resume`;
}

export async function uploadResume(candidateId, file) {
  const endpoint = `${ENDPOINTS.CANDIDATE_RESUME}/${candidateId}/resume`;
  if (!isLiveEndpoint(endpoint)) return emptySafeResponse(endpoint);
  const formData = new FormData();
  formData.append('resume', file);
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = data?.message || data?.error || 'Failed to upload resume';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return data;
}

export async function parseResume(file) {
  const endpoint = ENDPOINTS.PARSE_RESUME;
  if (!isLiveEndpoint(endpoint)) return emptySafeResponse(endpoint);
  const formData = new FormData();
  formData.append('resume', file);
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const message = data?.message || data?.error || 'Failed to parse resume';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return data;
}

export async function downloadResume(candidateId, fileName = 'resume') {
  const endpoint = getResumeDownloadUrl(candidateId);
  const token = localStorage.getItem('auth_token');
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const text = await res.text();
    let message = 'Failed to download resume';
    try {
      message = JSON.parse(text)?.message || message;
    } catch {
      if (text) message = text;
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
