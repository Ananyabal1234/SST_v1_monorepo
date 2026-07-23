import { useEffect, useMemo, useState } from 'react';
import { get, patch } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import {
  IconUsers, IconUserCheck, IconClock, IconCheckCircle, IconXCircle, IconBriefcase, IconEdit, IconFilePlus,
} from '../../components/Icons';

const STATUS_META = {
  JOINED: { icon: IconCheckCircle, cls: 'st-joined' },
  DOCS_PENDING: { icon: IconClock, cls: 'st-pending' },
  IN_PROGRESS: { icon: IconBriefcase, cls: 'st-pipeline' },
  ON_HOLD: { icon: IconXCircle, cls: 'st-rejected' },
  BACKOUT: { icon: IconXCircle, cls: 'st-rejected' },
  COMPLETED: { icon: IconUserCheck, cls: 'st-selected' },
};

const BGV_OPTIONS = ['NOT_STARTED', 'IN_PROGRESS', 'CLEARED', 'FAILED'];
const ONBOARDING_STATUS_OPTIONS = ['DOCS_PENDING', 'IN_PROGRESS', 'JOINED', 'ON_HOLD', 'COMPLETED', 'BACKOUT'];
const HR_OFFER_STATUS_CODES = ['RELEASED', 'ACCEPTED', 'DECLINED', 'HOLD', 'BACKOUT'];
const FALLBACK_OFFER_STATUSES = [
  { code: 'INITIATED', label: 'Initiated' },
  { code: 'RELEASED', label: 'Released' },
  { code: 'ACCEPTED', label: 'Accepted' },
  { code: 'DECLINED', label: 'Declined' },
  { code: 'HOLD', label: 'Hold' },
  { code: 'BACKOUT', label: 'Backout' },
];

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function normalizeList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function normalizeLookups(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.values)) return res.values;
  return [];
}

function statusLabel(code, options) {
  const found = options.find((o) => o.code === code);
  return found?.label || code || '—';
}

function onboardingRow(o, offerStatusOptions = FALLBACK_OFFER_STATUSES) {
  const offerStatus = o.offerStatus || o.offer?.statusCode || '';
  return {
    id: o.id,
    publicId: o.onboardingId || o.publicId || o.id || '—',
    offerPublicId: o.offerPublicId || o.offer?.publicId || '—',
    candidatePublicId: o.candidatePublicId || o.candidateCode || o.candidate?.publicId || '—',
    candidateName: o.candidateName || o.candidate?.name || '—',
    clientRole: o.clientRole || o.requirement?.roleSkill || '—',
    reqId: o.reqId || o.requirementPublicId || o.requirement?.publicId || '—',
    mobile: o.mobileNumber || o.candidate?.mobile || '—',
    email: o.emailAddress || o.candidate?.email || '—',
    offerStatus,
    offerStatusLabel: statusLabel(offerStatus, offerStatusOptions),
    ctcRate: o.ctcRate || o.offer?.ctcRate || '—',
    hrOwnerId: o.hrOwnerId || o.hrOwner?.id || '',
    hrOwnerName: o.hrOwnerName || o.hrOwner?.fullName || '—',
    expectedDoj: toDateInput(o.expectedDOJ || o.expectedDoj) || '—',
    actualDoj: toDateInput(o.actualDOJ || o.actualDoj) || '—',
    pendingDocs: o.pendingDocs ?? o.docsPending,
    bgvStatus: o.bgvStatus || o.bgvStatusCode || '—',
    onboardingStatus: o.onboardingStatus || o.statusCode || '—',
    requirementStatus: o.requirementStatus || o.requirement?.status || '—',
    remarks: o.remarks || '—',
  };
}

export default function HrCandidatesScreen() {
  const [rows, setRows] = useState([]);
  const [offerStatusOptions, setOfferStatusOptions] = useState(FALLBACK_OFFER_STATUSES);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [candidateLabel, setCandidateLabel] = useState('');
  const [form, setForm] = useState({
    offerStatus: 'ACCEPTED',
    docsPending: true,
    bgvStatusCode: 'NOT_STARTED',
    onboardingStatus: 'DOCS_PENDING',
    joiningFormalities: '',
    expectedDoj: '',
    actualDoj: '',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [loadingRow, setLoadingRow] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadOnboardings = async () => {
    const res = await get(ENDPOINTS.ONBOARDINGS);
    setRows(normalizeList(res));
  };

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      get(ENDPOINTS.ONBOARDINGS),
      get(`${ENDPOINTS.LOOKUPS}/OFFER_STATUS`).catch(() => null),
    ])
      .then(([res, lookupRes]) => {
        if (!active) return;
        setRows(normalizeList(res));
        const lookups = normalizeLookups(lookupRes)
          .map((v) => ({
            code: String(v.code || '').toUpperCase(),
            label: v.label || v.code,
          }))
          .filter((v) => v.code);
        if (lookups.length) {
          const allowed = new Set(['INITIATED', ...HR_OFFER_STATUS_CODES]);
          const filtered = lookups.filter((v) => allowed.has(v.code));
          setOfferStatusOptions(filtered.length ? filtered : FALLBACK_OFFER_STATUSES);
        }
      })
      .catch(() => active && setRows([]))
      .finally(() => active && setLoading(false));

    return () => { active = false; };
  }, []);

  const statuses = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const s = r.onboardingStatus || r.statusCode;
      if (s) set.add(s);
    });
    return [...set];
  }, [rows]);

  const counts = useMemo(() => {
    const base = { All: rows.length };
    statuses.forEach((s) => { base[s] = 0; });
    rows.forEach((r) => {
      const s = r.onboardingStatus || r.statusCode;
      if (s) base[s] = (base[s] || 0) + 1;
    });
    return base;
  }, [rows, statuses]);

  const visible = filter === 'All'
    ? rows
    : rows.filter((r) => (r.onboardingStatus || r.statusCode) === filter);

  const openUpdate = async (item) => {
    const id = item.id;
    if (!id) return;
    setEditingId(id);
    setCandidateLabel(
      [item.candidatePublicId || item.candidate?.publicId, item.candidateName || item.candidate?.name]
        .filter(Boolean).join(' — ')
    );
    setError(null);
    setSuccess(null);
    setModalOpen(true);
    setLoadingRow(true);
    try {
      const res = await get(`${ENDPOINTS.ONBOARDINGS}/${id}`);
      const data = res?.onboarding || res?.data || res;
      setForm({
        offerStatus: data.offerStatus || data.offer?.statusCode || 'ACCEPTED',
        docsPending: data.docsPending ?? data.pendingDocs ?? true,
        bgvStatusCode: data.bgvStatusCode || data.bgvStatus || 'NOT_STARTED',
        onboardingStatus: data.onboardingStatus || data.statusCode || 'DOCS_PENDING',
        joiningFormalities: data.joiningFormalities || '',
        expectedDoj: toDateInput(data.expectedDoj || data.expectedDOJ),
        actualDoj: toDateInput(data.actualDoj || data.actualDOJ),
        remarks: data.remarks || '',
      });
    } catch {
      setForm({
        offerStatus: item.offerStatus || item.offer?.statusCode || 'ACCEPTED',
        docsPending: item.docsPending ?? item.pendingDocs ?? true,
        bgvStatusCode: item.bgvStatusCode || item.bgvStatus || 'NOT_STARTED',
        onboardingStatus: item.onboardingStatus || item.statusCode || 'DOCS_PENDING',
        joiningFormalities: item.joiningFormalities || '',
        expectedDoj: toDateInput(item.expectedDoj || item.expectedDOJ),
        actualDoj: toDateInput(item.actualDoj || item.actualDOJ),
        remarks: item.remarks || '',
      });
    } finally {
      setLoadingRow(false);
    }
  };

  const saveOnboarding = async () => {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        offerStatus: form.offerStatus || undefined,
        docsPending: !!form.docsPending,
        bgvStatusCode: form.bgvStatusCode || 'NOT_STARTED',
        onboardingStatus: form.onboardingStatus || 'DOCS_PENDING',
        joiningFormalities: form.joiningFormalities || '',
        expectedDoj: form.expectedDoj || null,
        actualDoj: form.actualDoj || null,
        remarks: form.remarks || '',
      };
      const res = await patch(`${ENDPOINTS.ONBOARDINGS}/${editingId}`, payload);
      setSuccess(res?.message || 'Onboarding updated successfully');
      setModalOpen(false);
      await loadOnboardings();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update onboarding.';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="screen-loading"><div className="spinner" /></div>;

  return (
    <div className="hr-candidates">
      <div className="assign-head">
        <span className="assign-badge"><IconUsers /></span>
        <div>
          <h2 className="assign-title">Onboarding</h2>
          <p className="assign-sub">Track and update candidate onboarding.</p>
        </div>
      </div>

      <div className="hr-chips">
        {['All', ...statuses].map((s) => {
          const Meta = STATUS_META[s];
          const Icon = Meta ? Meta.icon : IconUsers;
          return (
            <button
              key={s}
              className={`hr-chip ${filter === s ? 'active' : ''} ${Meta ? Meta.cls : 'st-all'}`}
              onClick={() => setFilter(s)}
            >
              <Icon />
              <span>{s}</span>
              <em>{counts[s] || 0}</em>
            </button>
          );
        })}
      </div>

      {error && !modalOpen && <div className="add-error">{error}</div>}
      {success && <div className="add-success">{success}</div>}

      <div className="cand-table-wrap">
        <table className="cand-table hr-table">
          <thead>
            <tr>
              <th>Onboarding ID</th>
              <th>Offer ID</th>
              <th>Candidate ID</th>
              <th>Candidate</th>
              <th>Role</th>
              <th>Req ID</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Offer Status</th>
              <th>CTC</th>
              <th>HR Owner</th>
              <th>Expected DOJ</th>
              <th>Actual DOJ</th>
              <th>Pending Docs</th>
              <th>BGV</th>
              <th>Status</th>
              <th>Req Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr><td colSpan={18} className="cand-empty">No onboarding records yet.</td></tr>
            )}
            {visible.map((item) => {
              const row = onboardingRow(item, offerStatusOptions);
              const Meta = STATUS_META[row.onboardingStatus] || STATUS_META.DOCS_PENDING;
              return (
                <tr key={row.id || row.publicId}>
                  <td>{row.publicId}</td>
                  <td>{row.offerPublicId}</td>
                  <td>{row.candidatePublicId}</td>
                  <td>{row.candidateName}</td>
                  <td>{row.clientRole}</td>
                  <td>{row.reqId}</td>
                  <td>{row.email}</td>
                  <td>{row.mobile}</td>
                  <td>{row.offerStatusLabel}</td>
                  <td>{row.ctcRate}</td>
                  <td>{row.hrOwnerName}</td>
                  <td>{row.expectedDoj}</td>
                  <td>{row.actualDoj}</td>
                  <td>{row.pendingDocs ? 'Yes' : 'No'}</td>
                  <td>{row.bgvStatus}</td>
                  <td>
                    <span className={`hr-status-label ${Meta.cls}`}>
                      {row.onboardingStatus}
                    </span>
                  </td>
                  <td>{row.requirementStatus}</td>
                  <td>
                    <button className="hr-detail-btn" onClick={() => openUpdate(item)}>
                      <IconEdit />
                      <span>Update Details</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => !saving && setModalOpen(false)}>
          <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Update Onboarding Details{candidateLabel ? ` — ${candidateLabel}` : ''}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)} title="Close">×</button>
            </div>
            <div className="modal-body">
              {error && <div className="add-error">{error}</div>}
              {loadingRow ? (
                <div className="screen-loading"><div className="spinner" /></div>
              ) : (
                <div className="detail-grid">
                  <label className="detail-field">
                    <span className="detail-label">Offer Status</span>
                    <select
                      value={form.offerStatus || 'ACCEPTED'}
                      onChange={(e) => setForm((p) => ({ ...p, offerStatus: e.target.value }))}
                    >
                      {offerStatusOptions.map((o) => (
                        <option key={o.code} value={o.code}>{o.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="detail-field">
                    <span className="detail-label">Docs Pending</span>
                    <select
                      value={form.docsPending ? 'true' : 'false'}
                      onChange={(e) => setForm((p) => ({ ...p, docsPending: e.target.value === 'true' }))}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </label>

                  <label className="detail-field">
                    <span className="detail-label">BGV Status</span>
                    <select
                      value={form.bgvStatusCode}
                      onChange={(e) => setForm((p) => ({ ...p, bgvStatusCode: e.target.value }))}
                    >
                      {BGV_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>

                  <label className="detail-field">
                    <span className="detail-label">Onboarding Status</span>
                    <select
                      value={form.onboardingStatus}
                      onChange={(e) => setForm((p) => ({ ...p, onboardingStatus: e.target.value }))}
                    >
                      {ONBOARDING_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>

                  <label className="detail-field">
                    <span className="detail-label">Expected DOJ</span>
                    <input
                      type="date"
                      value={form.expectedDoj || ''}
                      onChange={(e) => setForm((p) => ({ ...p, expectedDoj: e.target.value }))}
                    />
                  </label>

                  <label className="detail-field">
                    <span className="detail-label">Actual DOJ</span>
                    <input
                      type="date"
                      value={form.actualDoj || ''}
                      onChange={(e) => setForm((p) => ({ ...p, actualDoj: e.target.value }))}
                    />
                  </label>

                  <label className="detail-field full">
                    <span className="detail-label">Joining Formalities</span>
                    <input
                      type="text"
                      value={form.joiningFormalities || ''}
                      onChange={(e) => setForm((p) => ({ ...p, joiningFormalities: e.target.value }))}
                    />
                  </label>

                  <label className="detail-field full">
                    <span className="detail-label">Remarks</span>
                    <textarea
                      rows={3}
                      value={form.remarks || ''}
                      onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                    />
                  </label>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="filter-clear" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</button>
              <button className="hr-detail-save" onClick={saveOnboarding} disabled={saving || loadingRow}>
                <IconFilePlus />
                <span>{saving ? 'Saving…' : 'Update Details'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
