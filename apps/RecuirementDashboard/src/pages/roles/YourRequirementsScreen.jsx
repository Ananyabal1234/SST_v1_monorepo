import { useState, useEffect, useMemo } from 'react';
import { get, put } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { IconList, IconFilter, IconBriefcase, IconFlag, IconClipboardCheck, IconEdit } from '../../components/Icons';

// Shows the requirements from the live backend (GET /api/v1/requirements).
// Sales users see only the requirements they own (salesOwnerId === user.id);
// admins see all requirements. Client / Priority / Status filters are applied
// client-side on top of the fetched list. Each row can be edited via a modal
// that PUTs to /api/v1/requirements/{id}.
export default function YourRequirementsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ clientId: '', priorityCode: '', status: '' });
  const [editing, setEditing] = useState(null); // requirement being edited
  const [viewingRequirement, setViewingRequirement] = useState(null); // requirement being viewed
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editSuccess, setEditSuccess] = useState(null);
  const [clientOptions, setClientOptions] = useState([]);
  const [jobFamilyOptions, setJobFamilyOptions] = useState([]);
  const [salesOwnerOptions, setSalesOwnerOptions] = useState([]);
  const [taOwnerOptions, setTaOwnerOptions] = useState([]);
  const [myTaskCandidates, setMyTaskCandidates] = useState({});
  const [myTaskLoading, setMyTaskLoading] = useState({});

  const normalizeId = (value) => (value == null ? null : String(value).trim());
  const normalizeEmail = (value) => (value == null ? null : String(value).trim().toLowerCase());
  const isOwnedByCurrentSalesUser = (r) => {
    const ownerEmail = r.salesOwner?.email || r.salesOwner?.emailAddress;
    const currentUserEmail = user?.email || user?.username;
    return ownerEmail != null && normalizeEmail(ownerEmail) === normalizeEmail(currentUserEmail);
  };

  const load = () => {
    let active = true;
    setLoading(true);
    setError(null);
    get(ENDPOINTS.REQUIREMENTS)
      .then((res) => {
        const list = Array.isArray(res)
          ? res
          : res?.items || res?.data?.items || res?.data || [];
        // Sales users only see their own requirements; admins see everything.
        const filtered = user?.userType === 'sales'
          ? list.filter(isOwnedByCurrentSalesUser)
          : list;
        console.debug('[YourRequirementsScreen] loaded requirements', {
          user,
          totalFetched: list.length,
          visibleForCurrentUser: filtered.length,
          sampleOwners: list.slice(0, 10).map((r) => ({ id: r.id, salesOwnerId: r.salesOwnerId, salesOwner: r.salesOwner?.id }))
        });
        active && setItems(filtered);
      })
      .catch((err) => {
        active && setError(err?.response?.data?.message || err?.message || 'Failed to load requirements');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  };

  useEffect(() => {
    let active = true;

    get(ENDPOINTS.CLIENTS)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        if (active) setClientOptions(list);
      })
      .catch(() => active && setClientOptions([]));

    get(ENDPOINTS.JOB_FAMILIES)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.data || [];
        if (active) setJobFamilyOptions(list);
      })
      .catch(() => active && setJobFamilyOptions([]));

    get(ENDPOINTS.SALES_MEMBERS)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        if (active) setSalesOwnerOptions(list);
      })
      .catch(() => active && setSalesOwnerOptions([]));

    get(ENDPOINTS.TA_MEMBERS)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        if (active) setTaOwnerOptions(list);
      })
      .catch(() => active && setTaOwnerOptions([]));

    return () => { active = false; };
  }, []);

  useEffect(load, [user]);

  // Distinct clients for the filter dropdown.
  const clients = useMemo(() => {
    const map = new Map();
    items.forEach((r) => {
      if (r.client?.id && r.client?.name) map.set(r.client.id, r.client.name);
    });
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [items]);

  const jobFamilies = useMemo(() => jobFamilyOptions.map((jf) => ({ id: jf.id, name: jf.name || jf.label || jf.id })), [jobFamilyOptions]);
  const salesOwners = useMemo(() => salesOwnerOptions.map((o) => ({ id: o.id, name: o.fullName || o.name || o.email || o.id })), [salesOwnerOptions]);
  const taOwners = useMemo(() => taOwnerOptions.map((o) => ({ id: o.id, name: o.fullName || o.name || o.email || o.id })), [taOwnerOptions]);

  const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW', 'CRITICAL'];
  const STATUSES = ['ACTIVE', 'CLOSED', 'ON_HOLD', 'DRAFT'];

  const visible = useMemo(() => {
    return items.filter((r) => {
      if (filters.clientId && r.client?.id !== filters.clientId) return false;
      if (filters.priorityCode && (r.priorityCode || '') !== filters.priorityCode) return false;
      if (filters.status && (r.status || '') !== filters.status) return false;
      return true;
    });
  }, [items, filters]);

  const myRequirements = useMemo(() => items.filter(isOwnedByCurrentSalesUser), [items, user]);

  const update = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const clearFilters = () => setFilters({ clientId: '', priorityCode: '', status: '' });
  const hasFilters = filters.clientId || filters.priorityCode || filters.status;

  const openEdit = (r) => {
    setEditing(r);
    setEditError(null);
    setEditSuccess(null);
    setForm({
      requirementDate: (r.requirementDate || '').slice(0, 10),
      clientId: r.client?.id || r.clientId || '',
      roleSkill: r.roleSkill || '',
      jobFamilyId: r.jobFamily?.id || r.jobFamilyId || '',
      numberOfPositions: r.numberOfPositions ?? '',
      salesOwnerId: r.salesOwner?.id || r.salesOwnerId || '',
      priorityCode: r.priorityCode || 'HIGH',
      taOwnerId: r.taOwner?.id || r.taOwnerId || '',
      taHandoffDate: (r.taHandoffDate || '').slice(0, 10),
      targetClosureDate: (r.targetClosureDate || '').slice(0, 10),
      remarks: r.remarks || '',
      experience: r.experience || '',
      jobLocation: r.jobLocation || '',
      minBudget: r.minBudget ?? '',
      maxBudget: r.maxBudget ?? '',
      durationMonths: r.durationMonths ?? '',
    });
  };

  const closeEdit = () => { setEditing(null); setForm({}); };
  const openRequirementDetails = (requirement) => { setViewingRequirement(requirement); };
  const closeRequirementDetails = () => { setViewingRequirement(null); };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const toggleMyTaskCandidates = async (requirement) => {
    const id = requirement.id;
    // hide if already loaded
    if (myTaskCandidates[id]) {
      setMyTaskCandidates((p) => { const copy = { ...p }; delete copy[id]; return copy; });
      return;
    }
    setMyTaskLoading((p) => ({ ...p, [id]: true }));
    try {
      const res = await get(ENDPOINTS.CANDIDATES);
      const list = Array.isArray(res) ? res : res?.items || res?.data || [];
      const filtered = list.filter((c) => c.requirementId === id || c.requirement?.id === id || c.requirementId === id);
      setMyTaskCandidates((p) => ({ ...p, [id]: filtered }));
    } catch (err) {
      setMyTaskCandidates((p) => ({ ...p, [id]: [] }));
    } finally {
      setMyTaskLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setEditError(null);
    setEditSuccess(null);
    const toInt = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : undefined; };
    const toNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };
    const payload = {
      requirementDate: form.requirementDate,
      clientId: form.clientId,
      roleSkill: form.roleSkill,
      jobFamilyId: form.jobFamilyId,
      numberOfPositions: toInt(form.numberOfPositions),
      salesOwnerId: form.salesOwnerId,
      priorityCode: form.priorityCode,
      taOwnerId: form.taOwnerId,
      taHandoffDate: form.taHandoffDate || undefined,
      targetClosureDate: form.targetClosureDate || undefined,
      remarks: form.remarks || undefined,
      experience: form.experience || undefined,
      jobLocation: form.jobLocation,
      minBudget: toNum(form.minBudget),
      maxBudget: toNum(form.maxBudget),
      durationMonths: toInt(form.durationMonths),
    };
    try {
      await put(`${ENDPOINTS.REQUIREMENT_BY_ID}/${editing.id}`, payload);
      setEditSuccess('Requirement updated successfully');
      closeEdit();
      load(); // refresh the list
    } catch (err) {
      setEditError(err?.response?.data?.message || err?.message || 'Failed to update requirement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="yr-screen">
      <div className="yr-head">
        <span className="yr-badge"><IconList /></span>
        <div>
          <h2 className="yr-title">Requirements</h2>
          <p className="yr-sub">
            {user?.userType === 'sales'
              ? 'Requirements you own, fetched live from the backend.'
              : 'All requirements, fetched live from the backend.'}
          </p>
        </div>
        {!loading && items.length > 0 && <span className="yr-count">{visible.length} shown</span>}
      </div>

      {!loading && !error && items.length > 0 && (
        <div className="filter-bar">
          <div className="filter-bar-head">
            <IconFilter />
            Filters
            {hasFilters && <span className="filter-count">{visible.length}</span>}
          </div>
          <div className="filter-fields">
            <div className="filter-field">
              <span className="filter-label"><IconBriefcase /> Client</span>
              <select value={filters.clientId} onChange={(e) => update('clientId', e.target.value)}>
                <option value="">All</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <span className="filter-label"><IconFlag /> Priority</span>
              <select value={filters.priorityCode} onChange={(e) => update('priorityCode', e.target.value)}>
                <option value="">All</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="filter-field">
              <span className="filter-label"><IconClipboardCheck /> Status</span>
              <select value={filters.status} onChange={(e) => update('status', e.target.value)}>
                <option value="">All</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button className="filter-clear" onClick={clearFilters}>Clear</button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="screen-loading"><div className="spinner" /></div>
      ) : error ? (
        <div className="add-error">{error}</div>
      ) : items.length === 0 ? (
        <div className="yr-empty">
          <IconList />
          <p>No requirements found. Use “Add Request” to raise one.</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="yr-empty">
          <IconList />
          <p>No requirements match the selected filters.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table yr-table">
            <thead>
              <tr>
                <th>Req ID</th>
                <th>Client</th>
                <th>Role / Skill</th>
                <th>Job Family</th>
                <th>Positions</th>
                <th>Priority</th>
                <th>Job Location</th>
                <th>Sales Owner</th>
                <th>TA Owner</th>
                <th>Status</th>
                <th>Added</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id || r.publicId} onClick={() => openRequirementDetails(r)}>
                  <td>{r.publicId || '—'}</td>
                  <td>{r.client?.name || '—'}</td>
                  <td>{r.roleSkill || '—'}</td>
                  <td>{r.jobFamily?.name || r.jobFamilyId || '—'}</td>
                  <td>{r.numberOfPositions ?? '—'}</td>
                  <td>{r.priorityCode || '—'}</td>
                  <td>{r.jobLocation || '—'}</td>
                  <td>{r.salesOwner?.fullName || '—'}</td>
                  <td>{r.taOwner?.fullName || '—'}</td>
                  <td>
                    <span className={`yr-status ${(r.status || 'ACTIVE').toLowerCase()}`}>{r.status || 'ACTIVE'}</span>
                  </td>
                  <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}</td>
                  <td>
                    <button className="cand-edit" onClick={(e) => { e.stopPropagation(); openEdit(r); }} title="Edit">
                      <IconEdit /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      

      {viewingRequirement && (
        <div className="modal-overlay" onClick={closeRequirementDetails}>
          <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Requirement Details — {viewingRequirement.publicId || viewingRequirement.id}</h3>
              <button className="modal-close" onClick={closeRequirementDetails} title="Close">×</button>
            </div>
            <div className="modal-body">
              <div className="detail-panel">
                <div className="detail-panel-head">
                  <h4>Overview</h4>
                </div>
                <div className="detail-grid detail-grid-2">
                  <div className="detail-item"><span className="detail-label">Req ID</span><span className="detail-value">{viewingRequirement.publicId || viewingRequirement.id || '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Client</span><span className="detail-value">{viewingRequirement.client?.name || viewingRequirement.clientName || '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Role / Skill</span><span className="detail-value">{viewingRequirement.roleSkill || '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Job Family</span><span className="detail-value">{viewingRequirement.jobFamily?.name || viewingRequirement.jobFamilyId || '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Positions</span><span className="detail-value">{viewingRequirement.numberOfPositions ?? '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Priority</span><span className="detail-value">{viewingRequirement.priorityCode || '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value">{viewingRequirement.status || '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Job Location</span><span className="detail-value">{viewingRequirement.jobLocation || '—'}</span></div>
                </div>
              </div>
              <div className="detail-panel">
                <div className="detail-panel-head">
                  <h4>Owners & dates</h4>
                </div>
                <div className="detail-grid detail-grid-2">
                  <div className="detail-item"><span className="detail-label">Sales Owner</span><span className="detail-value">{viewingRequirement.salesOwner?.fullName || viewingRequirement.salesOwner?.name || '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">TA Owner</span><span className="detail-value">{viewingRequirement.taOwner?.fullName || viewingRequirement.taOwner?.name || '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Requirement Date</span><span className="detail-value">{(viewingRequirement.requirementDate || '').slice(0, 10) || '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">TA Handoff Date</span><span className="detail-value">{(viewingRequirement.taHandoffDate || '').slice(0, 10) || '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Target Closure Date</span><span className="detail-value">{(viewingRequirement.targetClosureDate || '').slice(0, 10) || '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Experience (Years)</span><span className="detail-value">{viewingRequirement.experience || '—'}</span></div>
                </div>
              </div>
              <div className="detail-panel detail-panel-full">
                <div className="detail-panel-head">
                  <h4>Budget & description</h4>
                </div>
                <div className="detail-grid detail-grid-2">
                  <div className="detail-item"><span className="detail-label">Min Budget</span><span className="detail-value">{viewingRequirement.minBudget ?? '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Max Budget</span><span className="detail-value">{viewingRequirement.maxBudget ?? '—'}</span></div>
                  <div className="detail-item"><span className="detail-label">Duration (Months)</span><span className="detail-value">{viewingRequirement.durationMonths ?? '—'}</span></div>
                </div>
                <div className="detail-description">{viewingRequirement.remarks || 'No job description provided.'}</div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="filter-clear" type="button" onClick={closeRequirementDetails}>Close</button>
            </div>
          </div>
        </div>
      )}
      {editing && (
        <div className="modal-overlay" onClick={closeEdit}>
          <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Edit Requirement {editing.publicId || editing.id}</h3>
              <button className="modal-close" onClick={closeEdit} title="Close">×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="detail-grid">
                  <div className="detail-field">
                    <span className="detail-label">Requirement Date</span>
                    <input type="date" value={form.requirementDate} onChange={(e) => setField('requirementDate', e.target.value)} />
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Client</span>
                    <select value={form.clientId} onChange={(e) => setField('clientId', e.target.value)}>
                      <option value="">Select client…</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Role / Skill</span>
                    <input value={form.roleSkill} onChange={(e) => setField('roleSkill', e.target.value)} />
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Job Family</span>
                    <select value={form.jobFamilyId} onChange={(e) => setField('jobFamilyId', e.target.value)}>
                      <option value="">Select job family…</option>
                      {jobFamilies.map((jf) => (
                        <option key={jf.id} value={jf.id}>{jf.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Positions</span>
                    <input type="number" min="0" value={form.numberOfPositions} onChange={(e) => setField('numberOfPositions', e.target.value)} />
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Sales Owner</span>
                    <select value={form.salesOwnerId} onChange={(e) => setField('salesOwnerId', e.target.value)}>
                      <option value="">Select sales owner…</option>
                      {salesOwners.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Priority</span>
                    <select value={form.priorityCode} onChange={(e) => setField('priorityCode', e.target.value)}>
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">TA Owner</span>
                    <select value={form.taOwnerId} onChange={(e) => setField('taOwnerId', e.target.value)}>
                      <option value="">Select TA owner…</option>
                      {taOwners.map((o) => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">TA Handoff Date</span>
                    <input type="date" value={form.taHandoffDate} onChange={(e) => setField('taHandoffDate', e.target.value)} />
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Target Closure Date</span>
                    <input type="date" value={form.targetClosureDate} onChange={(e) => setField('targetClosureDate', e.target.value)} />
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Experience</span>
                    <input value={form.experience} onChange={(e) => setField('experience', e.target.value)} />
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Job Location</span>
                    <input value={form.jobLocation} onChange={(e) => setField('jobLocation', e.target.value)} />
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Min Budget</span>
                    <input type="number" min="0" value={form.minBudget} onChange={(e) => setField('minBudget', e.target.value)} />
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Max Budget</span>
                    <input type="number" min="0" value={form.maxBudget} onChange={(e) => setField('maxBudget', e.target.value)} />
                  </div>
                  <div className="detail-field">
                    <span className="detail-label">Duration (Months)</span>
                    <input type="number" min="0" value={form.durationMonths} onChange={(e) => setField('durationMonths', e.target.value)} />
                  </div>
                  <div className="detail-field full">
                    <span className="detail-label">Job Description</span>
                    <textarea value={form.remarks} onChange={(e) => setField('remarks', e.target.value)} />
                  </div>
                </div>
                {editError && <div className="add-error">{editError}</div>}
                {editSuccess && <div className="add-success">{editSuccess}</div>}
              </div>
              <div className="modal-foot">
                <button type="button" className="add-reset" onClick={closeEdit}>Cancel</button>
                <button type="submit" className="hr-detail-save" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
