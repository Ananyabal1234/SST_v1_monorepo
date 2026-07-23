import { useEffect, useState } from 'react';
import { get, post } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { IconUser, IconFilePlus } from '../../components/Icons';

const EMPTY_FORM = {
  email: '',
  fullName: '',
  role: 'ADMIN',
  password: '',
};

const FALLBACK_ROLES = [
  { value: 'SALES', label: 'Sales Owner' },
  { value: 'TA', label: 'TA Owner' },
  { value: 'HR', label: 'HR Owner' },
  { value: 'LEADERSHIP_READONLY', label: 'Leadership (read-only)' },
  { value: 'ADMIN', label: 'Admin' },
];

function normalizeRoleOptions(res) {
  const options = res?.options || res?.items || (Array.isArray(res) ? res : []);
  return options
    .map((o) => ({
      value: o.value || o.code || o.role || o,
      label: o.label || o.name || o.value || o.code || String(o),
      description: o.description || '',
    }))
    .filter((o) => o.value);
}

export default function CreateUserScreen() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [roles, setRoles] = useState(FALLBACK_ROLES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let active = true;
    get(ENDPOINTS.USER_ROLES)
      .then((res) => {
        if (!active) return;
        const list = normalizeRoleOptions(res);
        if (list.length) {
          setRoles(list);
          setForm((p) => ({
            ...p,
            role: list.some((r) => r.value === p.role) ? p.role : list[0].value,
          }));
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const selectedRole = roles.find((r) => r.value === form.role);

  const saveUser = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!form.fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!form.role) {
      setError('Role is required.');
      return;
    }
    if (!form.password || form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        email: form.email.trim(),
        fullName: form.fullName.trim(),
        role: form.role,
        password: form.password,
      };
      const res = await post(ENDPOINTS.USERS, payload);
      setSuccess(res?.message || `User created: ${payload.fullName} (${payload.role})`);
      setForm({ ...EMPTY_FORM, role: form.role });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hr-candidates">
      <div className="assign-head">
        <span className="assign-badge"><IconUser /></span>
        <div>
          <h2 className="assign-title">Create User</h2>
          <p className="assign-sub">Admin only — create login credentials for Sales, TA, HR, Leadership, or Admin.</p>
        </div>
      </div>

      {error && <div className="add-error">{error}</div>}
      {success && <div className="add-success">{success}</div>}

      <form className="add-form" onSubmit={saveUser} style={{ maxWidth: 560 }}>
        <div className="detail-grid" style={{ gridTemplateColumns: '1fr' }}>
          <label className="detail-field">
            <span className="detail-label">Email *</span>
            <input
              type="email"
              placeholder="user@example.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </label>

          <label className="detail-field">
            <span className="detail-label">Full Name *</span>
            <input
              type="text"
              placeholder="Full name"
              value={form.fullName}
              onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              required
            />
          </label>

          <label className="detail-field">
            <span className="detail-label">Role *</span>
            <select
              value={form.role}
              onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
              required
            >
              {roles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {selectedRole?.description && (
              <span className="detail-label" style={{ marginTop: 4 }}>{selectedRole.description}</span>
            )}
          </label>

          <label className="detail-field">
            <span className="detail-label">Password *</span>
            <input
              type="password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              minLength={8}
            />
          </label>
        </div>

        <div style={{ marginTop: 18 }}>
          <button type="submit" className="hr-detail-save" disabled={saving}>
            <IconFilePlus />
            <span>{saving ? 'Creating…' : 'Create User'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
