import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { post, get } from '../services/apiClient';
import { ENDPOINTS } from '../config/api';

const AuthContext = createContext(null);

export const USER_TYPES = {
  SALES: 'sales',
  SALES_LEAD: 'sales_lead',
  TA_OWNER: 'ta_owner',
  TA_LEAD: 'ta_lead',
  HR: 'hr',
  HR_LEAD: 'hr_lead',
  ONBOARDING: 'onboarding',
  ADMIN: 'admin',
};

export const USER_TYPE_LABELS = {
  sales: 'Sales',
  sales_lead: 'Sales Lead',
  ta_owner: 'TA Owner',
  ta_lead: 'TA Lead',
  hr: 'HR',
  hr_lead: 'HR Lead',
  onboarding: 'Onboarding',
  admin: 'Admin',
};

// Map the backend's role string (e.g. "ADMIN", "SALES", "TA", "HR") to the
// app's internal user type. Anything unknown falls back to admin.
const ROLE_TO_USER_TYPE = {
  ADMIN: 'admin',
  SALES: 'sales',
  SALES_LEAD: 'sales_lead',
  TA: 'ta_owner',
  TA_OWNER: 'ta_owner',
  TA_LEAD: 'ta_lead',
  HR: 'hr',
  HR_LEAD: 'hr_lead',
  ONBOARDING: 'onboarding',
};

function normalizeUser(raw) {
  const role = (raw.role || '').toUpperCase();
  return {
    id: raw.id,
    email: raw.email,
    name: raw.fullName || raw.name || raw.email,
    role: raw.role,
    userType: ROLE_TO_USER_TYPE[role] || 'admin',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore session if a token exists.
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      get(ENDPOINTS.ME)
        .then((res) => {
          setUser(normalizeUser(res));
          localStorage.setItem('auth_email', res.email);
        })
        .catch(() => {
          // Access/refresh both dead — clear full session (apiClient may already
          // have wiped storage after a failed refresh).
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_refresh_token');
          localStorage.removeItem('auth_email');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      // Stale refresh alone is useless without access token.
      if (!localStorage.getItem('auth_refresh_token')) {
        setLoading(false);
        return;
      }
      // Try a silent refresh when only the refresh token remains.
      post(ENDPOINTS.REFRESH, {
        refreshToken: localStorage.getItem('auth_refresh_token'),
      })
        .then(async (res) => {
          localStorage.setItem('auth_token', res.accessToken);
          localStorage.setItem('auth_refresh_token', res.refreshToken);
          const me = await get(ENDPOINTS.ME);
          setUser(normalizeUser(me));
          localStorage.setItem('auth_email', me.email);
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_refresh_token');
          localStorage.removeItem('auth_email');
          setUser(null);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await post(ENDPOINTS.LOGIN, { email, password });
    localStorage.setItem('auth_token', res.accessToken);
    localStorage.setItem('auth_refresh_token', res.refreshToken);
    localStorage.setItem('auth_email', res.user.email);
    const normalized = normalizeUser(res.user);
    setUser(normalized);
    return normalized;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('auth_refresh_token');
    // Best-effort: notify the backend so the refresh token is invalidated.
    if (refreshToken) {
      try {
        await post(ENDPOINTS.LOGOUT, { refreshToken });
      } catch {
        // Ignore network/API errors — local session is cleared regardless.
      }
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_email');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
