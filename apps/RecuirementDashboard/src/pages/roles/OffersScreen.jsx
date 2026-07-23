import { useEffect, useState } from 'react';
import { get, patch } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { IconCheckCircle, IconFilePlus, IconEdit } from '../../components/Icons';

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

function normalizeOffers(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.offers)) return res.offers;
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

function offerRow(o, statusOptions) {
  const status = o.offerStatus || o.statusCode || '';
  return {
    id: o.id,
    publicId: o.publicId || o.id || '—',
    candidateId: o.candidateId || o.candidate?.id || '',
    candidatePublicId: o.candidatePublicId || o.candidate?.publicId || '—',
    candidateName: o.candidateName || o.candidate?.name || '—',
    position: o.position || o.requirement?.roleSkill || '—',
    client: o.client || o.requirement?.client || '—',
    email: o.email || o.candidate?.email || '—',
    mobile: o.mobile || o.candidate?.mobile || '—',
    status,
    statusLabel: statusLabel(status, statusOptions),
    ctcRate: o.ctcRate || '—',
    selectedDate: toDateInput(o.selectedDate) || '—',
    offerInitiatedDate: toDateInput(o.offerInitiatedDate) || '—',
    offerReleasedDate: toDateInput(o.offerReleasedDate) || '—',
    expectedDoj: toDateInput(o.expectedDoj) || '—',
    remarks: o.remarks || '—',
  };
}

export default function OffersScreen() {
  const [offers, setOffers] = useState([]);
  const [statusOptions, setStatusOptions] = useState(FALLBACK_OFFER_STATUSES);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [candidateLabel, setCandidateLabel] = useState('');
  const [form, setForm] = useState({
    statusCode: 'INITIATED',
    offerInitiatedDate: '',
    offerReleasedDate: '',
    ctcRate: '',
    expectedDoj: '',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [loadingOffer, setLoadingOffer] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadOffers = async () => {
    const res = await get(ENDPOINTS.OFFERS);
    setOffers(normalizeOffers(res));
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      get(ENDPOINTS.OFFERS),
      get(`${ENDPOINTS.LOOKUPS}/OFFER_STATUS`).catch(() => null),
    ])
      .then(([offersRes, lookupRes]) => {
        if (!active) return;
        setOffers(normalizeOffers(offersRes));
        const lookups = normalizeLookups(lookupRes)
          .map((v) => ({
            code: String(v.code || '').toUpperCase(),
            label: v.label || v.code,
          }))
          .filter((v) => v.code);
        if (lookups.length) {
          const allowed = new Set(['INITIATED', ...HR_OFFER_STATUS_CODES]);
          const filtered = lookups.filter((v) => allowed.has(v.code));
          setStatusOptions(filtered.length ? filtered : FALLBACK_OFFER_STATUSES);
        }
      })
      .catch(() => active && setOffers([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const selectOptions = (() => {
    const codes = new Set(statusOptions.map((o) => o.code));
    // Always allow INITIATED for display when current offer is still initiated.
    if (!codes.has('INITIATED')) {
      return [{ code: 'INITIATED', label: 'Initiated' }, ...statusOptions];
    }
    return statusOptions;
  })();

  const openUpdate = async (offer) => {
    const id = offer.id;
    if (!id) return;
    setEditingId(id);
    setCandidateLabel(
      [offer.candidatePublicId || offer.candidate?.publicId, offer.candidateName || offer.candidate?.name]
        .filter(Boolean).join(' — ')
    );
    setError(null);
    setSuccess(null);
    setModalOpen(true);
    setLoadingOffer(true);
    try {
      const res = await get(`${ENDPOINTS.OFFERS}/${id}`);
      const data = res?.offer || res?.data || res;
      setForm({
        statusCode: data.offerStatus || data.statusCode || 'INITIATED',
        offerInitiatedDate: toDateInput(data.offerInitiatedDate),
        offerReleasedDate: toDateInput(data.offerReleasedDate),
        ctcRate: data.ctcRate || '',
        expectedDoj: toDateInput(data.expectedDoj),
        remarks: data.remarks || '',
      });
      setCandidateLabel(
        [data.candidatePublicId || data.candidate?.publicId, data.candidateName || data.candidate?.name]
          .filter(Boolean).join(' — ') || candidateLabel
      );
    } catch {
      setForm({
        statusCode: offer.offerStatus || offer.statusCode || 'INITIATED',
        offerInitiatedDate: toDateInput(offer.offerInitiatedDate),
        offerReleasedDate: toDateInput(offer.offerReleasedDate),
        ctcRate: offer.ctcRate || '',
        expectedDoj: toDateInput(offer.expectedDoj),
        remarks: offer.remarks || '',
      });
    } finally {
      setLoadingOffer(false);
    }
  };

  const saveOffer = async () => {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        statusCode: form.statusCode || 'INITIATED',
        offerInitiatedDate: form.offerInitiatedDate || null,
        offerReleasedDate: form.offerReleasedDate || null,
        ctcRate: form.ctcRate || '',
        expectedDoj: form.expectedDoj || null,
        remarks: form.remarks || '',
      };
      const res = await patch(`${ENDPOINTS.OFFERS}/${editingId}`, payload);
      setSuccess(res?.message || 'Offer updated successfully');
      setModalOpen(false);
      await loadOffers();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to update offer.';
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="screen-loading"><div className="spinner" /></div>;

  return (
    <div className="hr-candidates">
      <div className="assign-head">
        <span className="assign-badge"><IconCheckCircle /></span>
        <div>
          <h2 className="assign-title">Offers</h2>
          <p className="assign-sub">View and update candidate offers.</p>
        </div>
      </div>

      {error && !modalOpen && <div className="add-error">{error}</div>}
      {success && <div className="add-success">{success}</div>}

      <div className="cand-table-wrap">
        <table className="cand-table hr-table">
          <thead>
            <tr>
              <th>Offer ID</th>
              <th>Candidate ID</th>
              <th>Candidate</th>
              <th>Position</th>
              <th>Client</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>Offer Status</th>
              <th>CTC Rate</th>
              <th>Selected</th>
              <th>Initiated</th>
              <th>Released</th>
              <th>Expected DOJ</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.length === 0 && (
              <tr><td colSpan={14} className="cand-empty">No offers found.</td></tr>
            )}
            {offers.map((o) => {
              const row = offerRow(o, selectOptions);
              return (
                <tr key={row.id || row.publicId}>
                  <td>{row.publicId}</td>
                  <td>{row.candidatePublicId}</td>
                  <td>{row.candidateName}</td>
                  <td>{row.position}</td>
                  <td>{row.client}</td>
                  <td>{row.email}</td>
                  <td>{row.mobile}</td>
                  <td>{row.statusLabel}</td>
                  <td>{row.ctcRate}</td>
                  <td>{row.selectedDate}</td>
                  <td>{row.offerInitiatedDate}</td>
                  <td>{row.offerReleasedDate}</td>
                  <td>{row.expectedDoj}</td>
                  <td>
                    <button className="hr-detail-btn" onClick={() => openUpdate(o)}>
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
              <h3>Update Offer Details{candidateLabel ? ` — ${candidateLabel}` : ''}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)} title="Close">×</button>
            </div>
            <div className="modal-body">
              {error && <div className="add-error">{error}</div>}
              {loadingOffer ? (
                <div className="screen-loading"><div className="spinner" /></div>
              ) : (
                <div className="detail-grid">
                  <label className="detail-field">
                    <span className="detail-label">Offer Status</span>
                    <select
                      value={form.statusCode || 'INITIATED'}
                      onChange={(e) => setForm((p) => ({ ...p, statusCode: e.target.value }))}
                    >
                      {selectOptions.map((o) => (
                        <option key={o.code} value={o.code}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="detail-field">
                    <span className="detail-label">Offer Initiated Date</span>
                    <input
                      type="date"
                      value={form.offerInitiatedDate || ''}
                      onChange={(e) => setForm((p) => ({ ...p, offerInitiatedDate: e.target.value }))}
                    />
                  </label>
                  <label className="detail-field">
                    <span className="detail-label">Offer Released Date</span>
                    <input
                      type="date"
                      value={form.offerReleasedDate || ''}
                      onChange={(e) => setForm((p) => ({ ...p, offerReleasedDate: e.target.value }))}
                    />
                  </label>
                  <label className="detail-field">
                    <span className="detail-label">CTC Rate</span>
                    <input
                      type="text"
                      placeholder="e.g. 18 LPA"
                      value={form.ctcRate || ''}
                      onChange={(e) => setForm((p) => ({ ...p, ctcRate: e.target.value }))}
                    />
                  </label>
                  <label className="detail-field">
                    <span className="detail-label">Expected DOJ</span>
                    <input
                      type="date"
                      value={form.expectedDoj || ''}
                      onChange={(e) => setForm((p) => ({ ...p, expectedDoj: e.target.value }))}
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
              <button className="hr-detail-save" onClick={saveOffer} disabled={saving || loadingOffer}>
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
