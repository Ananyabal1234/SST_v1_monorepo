import { useCallback, useEffect, useState } from 'react';
import { get, post, patch, del } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { IconUser, IconFilePlus, IconFilter, IconEdit, IconEye, IconEyeOff, IconX } from '../../components/Icons';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { formatDate } from '../../utils/formatDate';
import { useToast } from '../../context/ToastContext';
import TableSearch from '../../components/TableSearch';
import { EmptyState } from '../../components/ui';

const EMPTY_FORM = {
  email: '',
  fullName: '',
  role: 'ADMIN',
  password: '',
};

const PAGE_SIZE = 20;

const FALLBACK_ROLES = [
  { value: 'SALES', label: 'Sales Owner' },
  { value: 'SALES_LEAD', label: 'Sales Lead' },
  { value: 'TA', label: 'TA Owner' },
  { value: 'TA_LEAD', label: 'TA Lead' },
  { value: 'HR', label: 'HR Owner' },
  { value: 'HR_LEAD', label: 'HR Lead' },
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

function roleLabel(roles, value) {
  return roles.find((r) => r.value === value)?.label || value;
}

function errorMessage(err, fallback) {
  const msg = err?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg || fallback;
}

export default function UsersScreen() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [roles, setRoles] = useState(FALLBACK_ROLES);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

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

  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter === 'active') params.set('isActive', 'true');
      if (statusFilter === 'inactive') params.set('isActive', 'false');
      if (searchQ) params.set('q', searchQ);

      const res = await get(`${ENDPOINTS.USERS}?${params.toString()}`);
      setUsers(Array.isArray(res?.items) ? res.items : []);
      setTotal(Number(res?.total) || 0);
      setPageSize(Number(res?.pageSize) || PAGE_SIZE);
    } catch (err) {
      setUsers([]);
      setTotal(0);
      setListError(errorMessage(err, 'Failed to load users.'));
    } finally {
      setListLoading(false);
    }
  }, [page, roleFilter, statusFilter, searchQ]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const selectedRole = roles.find((r) => r.value === form.role);
  const editSelectedRole = roles.find((r) => r.value === editing?.role);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isSelf = (id) => currentUser?.id && id === currentUser.id;
  const hasFilters = Boolean(roleFilter || statusFilter || searchInput.trim());

  const clearFilters = () => {
    setRoleFilter('');
    setStatusFilter('');
    setSearchInput('');
    setSearchQ('');
    setPage(1);
  };

  const openEdit = (u) => {
    setEditError(null);
    setSuccess(null);
    setShowResetPassword(false);
    setEditing({
      id: u.id,
      email: u.email,
      fullName: u.fullName || '',
      role: u.role,
      isActive: Boolean(u.isActive),
      newPassword: '',
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditError(null);
    setEditSaving(false);
    setShowResetPassword(false);
  };

  useEscapeKey(Boolean(editing), closeEdit);

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editing?.id) return;
    if (!editing.fullName.trim()) {
      setEditError('Full name is required.');
      return;
    }
    if (!editing.role) {
      setEditError('Role is required.');
      return;
    }
    if (editing.newPassword && editing.newPassword.length < 8) {
      setEditError('New password must be at least 8 characters.');
      return;
    }
    if (isSelf(editing.id) && !editing.isActive) {
      setEditError('You cannot deactivate your own account.');
      return;
    }

    setEditSaving(true);
    setEditError(null);
    setError(null);
    setSuccess(null);
    try {
      await patch(`${ENDPOINTS.USERS}/${editing.id}`, {
        fullName: editing.fullName.trim(),
        role: editing.role,
        isActive: editing.isActive,
      });
      if (editing.newPassword) {
        await post(`${ENDPOINTS.USERS}/${editing.id}/reset-password`, {
          password: editing.newPassword,
        });
      }
      setSuccess(
        editing.newPassword
          ? `User updated and password reset: ${editing.fullName}`
          : `User updated: ${editing.fullName}`,
      );
      toast(
        editing.newPassword
          ? `User updated and password reset: ${editing.fullName}`
          : `User updated: ${editing.fullName}`,
      );
      closeEdit();
      await loadUsers();
    } catch (err) {
      setEditError(errorMessage(err, 'Failed to update user.'));
    } finally {
      setEditSaving(false);
    }
  };

  const deleteUser = async (u) => {
    if (!u?.id) return;
    if (isSelf(u.id)) {
      setError('You cannot delete your own account.');
      return;
    }
    const confirmed = window.confirm(
      `Delete user "${u.fullName}" (${u.email})?\n\nThey will be deactivated and removed from the active user list.`,
    );
    if (!confirmed) return;

    setDeletingId(u.id);
    setError(null);
    setSuccess(null);
    try {
      await del(`${ENDPOINTS.USERS}/${u.id}`);
      setSuccess(`User deleted: ${u.fullName}`);
      toast(`User deleted: ${u.fullName}`);
      if (editing?.id === u.id) closeEdit();
      await loadUsers();
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete user.'));
    } finally {
      setDeletingId(null);
    }
  };

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
      toast(res?.message || `User created: ${payload.fullName} (${payload.role})`);
      setForm({ ...EMPTY_FORM, role: form.role });
      setPage(1);
      await loadUsers();
    } catch (err) {
      setError(errorMessage(err, 'Failed to create user.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="users-screen">
      <div className="assign-head">
        <span className="assign-badge"><IconUser /></span>
        <div>
          <h2 className="assign-title">Users</h2>
          <p className="assign-sub">
            View, create, edit, and delete login credentials by role.
          </p>
        </div>
        <span className="yr-count">{total} users</span>
      </div>

      <div className="filter-bar">
        <div className="filter-bar-head">
          <IconFilter />
          <span>Filters</span>
          {hasFilters && (
            <span className="filter-count">
              {(roleFilter ? 1 : 0) + (statusFilter ? 1 : 0) + (searchInput.trim() ? 1 : 0)} active
            </span>
          )}
          {hasFilters && (
            <button type="button" className="filter-clear" onClick={clearFilters}>
              Clear
            </button>
          )}
        </div>
        {hasFilters && (
          <div className="filter-chips" aria-label="Active filters">
            {roleFilter && (
              <button type="button" className="filter-chip" onClick={() => { setRoleFilter(''); setPage(1); }}>
                Role: {roleLabel(roles, roleFilter)}
                <IconX width={12} height={12} />
              </button>
            )}
            {statusFilter && (
              <button type="button" className="filter-chip" onClick={() => { setStatusFilter(''); setPage(1); }}>
                Status: {statusFilter === 'active' ? 'Active' : 'Inactive'}
                <IconX width={12} height={12} />
              </button>
            )}
            {searchInput.trim() && (
              <button type="button" className="filter-chip" onClick={() => { setSearchInput(''); setSearchQ(''); setPage(1); }}>
                Search: {searchInput.trim()}
                <IconX width={12} height={12} />
              </button>
            )}
          </div>
        )}
        <div className="filter-fields">
          <label className="filter-field">
            <span className="filter-label">Role</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span className="filter-label">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
        <TableSearch
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search name or email…"
        />
      </div>

      {listError && <div className="add-error">{listError}</div>}
      {error && <div className="add-error">{error}</div>}
      {success && <div className="add-success">{success}</div>}

      {!listLoading && users.length === 0 ? (
        <EmptyState
          icon={IconUser}
          title="No users found"
          description={hasFilters ? 'Try a different search or clear filters.' : 'Create a user below to add the first login.'}
        />
      ) : (
      <div className="table-wrap users-table-card">
        <table className="data-table users-table">
          <thead>
            <tr>
              <th>Full name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {listLoading && users.length === 0 ? (
              <tr>
                <td colSpan={6}>Loading users…</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.fullName}
                    {isSelf(u.id) ? <span className="users-you">you</span> : null}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className="users-pill users-pill-role">{roleLabel(roles, u.role)}</span>
                  </td>
                  <td>
                    <span className={`users-pill users-pill-status ${u.isActive ? 'active' : 'inactive'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <div className="users-row-actions">
                      <button
                        type="button"
                        className="cand-edit"
                        onClick={() => openEdit(u)}
                        title="Edit user"
                      >
                        <IconEdit /> Edit
                      </button>
                      <button
                        type="button"
                        className="filter-clear users-delete-btn"
                        disabled={isSelf(u.id) || deletingId === u.id}
                        onClick={() => deleteUser(u)}
                        title={isSelf(u.id) ? 'Cannot delete your own account' : 'Delete user'}
                      >
                        {deletingId === u.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {total > 0 && (
        <div className="users-pager">
          <button
            type="button"
            className="filter-clear"
            disabled={page <= 1 || listLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="users-pager-meta">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="filter-clear"
            disabled={page >= totalPages || listLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      <section className="users-create">
        <div className="users-create-head">
          <h3>Create User</h3>
          <p>Admin only — create login credentials for Sales, Sales Lead, TA, TA Lead, HR, HR Lead, or Admin.</p>
        </div>
        <form onSubmit={saveUser}>
          <div className="users-create-grid">
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
                <span className="detail-label field-hint">{selectedRole.description}</span>
              )}
            </label>

            <label className="detail-field">
              <span className="detail-label">Password *</span>
              <div className="password-field">
                <input
                  type={showCreatePassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCreatePassword((v) => !v)}
                  title={showCreatePassword ? 'Hide password' : 'Show password'}
                  aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                >
                  {showCreatePassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </label>
          </div>

          <div className="users-create-actions">
            <button type="submit" className="hr-detail-save" disabled={saving}>
              <IconFilePlus />
              <span>{saving ? 'Creating…' : 'Create User'}</span>
            </button>
          </div>
        </form>
      </section>

      {editing && (
        <div
          className="modal-overlay"
          onClick={closeEdit}
          role="presentation"
        >
          <div
            className="modal-card detail-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
          >
            <div className="modal-head">
              <h3 id="edit-user-title">Edit User — {editing.email}</h3>
              <button type="button" className="modal-close" onClick={closeEdit} title="Close" aria-label="Close dialog">×</button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="modal-body">
                {editError && <div className="add-error" role="alert">{editError}</div>}
                <div className="detail-grid single-col">
                  <label className="detail-field">
                    <span className="detail-label">Email</span>
                    <input type="email" value={editing.email} readOnly disabled />
                  </label>

                  <label className="detail-field">
                    <span className="detail-label">Full Name *</span>
                    <input
                      type="text"
                      value={editing.fullName}
                      onChange={(e) => setEditing((p) => ({ ...p, fullName: e.target.value }))}
                      required
                    />
                  </label>

                  <label className="detail-field">
                    <span className="detail-label">Role *</span>
                    <select
                      value={editing.role}
                      onChange={(e) => setEditing((p) => ({ ...p, role: e.target.value }))}
                      required
                    >
                      {roles.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    {editSelectedRole?.description && (
                      <span className="detail-label field-hint">
                        {editSelectedRole.description}
                      </span>
                    )}
                  </label>

                  <label className="detail-field">
                    <span className="detail-label">Status</span>
                    <select
                      value={editing.isActive ? 'active' : 'inactive'}
                      disabled={isSelf(editing.id)}
                      onChange={(e) => setEditing((p) => ({
                        ...p,
                        isActive: e.target.value === 'active',
                      }))}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    {isSelf(editing.id) && (
                      <span className="detail-label field-hint">
                        You cannot deactivate your own account.
                      </span>
                    )}
                  </label>

                  <label className="detail-field">
                    <span className="detail-label">Reset password (optional)</span>
                    <div className="password-field">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        placeholder="Leave blank to keep current password"
                        value={editing.newPassword}
                        onChange={(e) => setEditing((p) => ({ ...p, newPassword: e.target.value }))}
                        minLength={8}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowResetPassword((v) => !v)}
                        title={showResetPassword ? 'Hide password' : 'Show password'}
                        aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                      >
                        {showResetPassword ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                  </label>
                </div>
              </div>
              <div className="modal-foot">
                <button type="button" className="filter-clear" onClick={closeEdit} disabled={editSaving}>
                  Cancel
                </button>
                {!isSelf(editing.id) && (
                  <button
                    type="button"
                    className="filter-clear users-delete-btn"
                    disabled={editSaving || deletingId === editing.id}
                    onClick={() => deleteUser(editing)}
                  >
                    Delete
                  </button>
                )}
                <button type="submit" className="hr-detail-save" disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
