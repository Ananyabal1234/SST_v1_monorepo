import { useState, useEffect, useCallback } from 'react';
import { post, get } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { addRequirement } from '../../services/requirementsStore';
import { useAuth } from '../../context/AuthContext';
import TaOwnersMultiSelect from '../../components/TaOwnersMultiSelect';
import { IconBriefcase, IconUser, IconTarget, IconFolderOpen, IconWallet, IconMapPin, IconClock, IconPlus, IconCalendar, IconFlag } from '../../components/Icons';

import { PageHeader } from '../../components/ui';

const EMPTY = {
  requirementDate: '',
  clientName: '',
  roleSkill: '',
  jobFamilyName: '',
  numberOfPositions: '',
  salesOwnerId: '',
  priorityCode: 'HIGH',
  taHandoffDate: '',
  targetClosureDate: '',
  remarks: '',
  experience: '',
  jobLocation: '',
  minBudget: '',
  maxBudget: '',
  durationMonths: '',
};

const PRIORITY_OPTIONS = ['HIGH', 'MEDIUM', 'LOW'];

const FIELDS = [
  { key: 'requirementDate', label: 'Requirement Date', type: 'date', icon: IconCalendar, required: true },
  { key: 'clientName', label: 'Client', type: 'combobox-client', icon: IconBriefcase, required: true, placeholder: 'Select or type a client' },
  { key: 'roleSkill', label: 'Role / Skill', type: 'text', icon: IconUser, placeholder: 'e.g. Core Python Developer', required: true },
  { key: 'jobFamilyName', label: 'Job Family', type: 'combobox-jobfamily', icon: IconFolderOpen, required: true, placeholder: 'Select or type a job family' },
  { key: 'numberOfPositions', label: 'Number of Positions', type: 'number', icon: IconTarget, placeholder: 'e.g. 5', required: true, min: 1 },
  { key: 'salesOwnerId', label: 'Sales Owner', type: 'select-owner', ownerSource: 'sales', icon: IconUser, required: true },
  { key: 'priorityCode', label: 'Priority', type: 'select', icon: IconFlag, options: PRIORITY_OPTIONS, required: true },
  { key: 'taHandoffDate', label: 'TA Handoff Date', type: 'date', icon: IconCalendar, required: false },
  { key: 'targetClosureDate', label: 'Target Closure Date', type: 'date', icon: IconCalendar, required: false },
  { key: 'experience', label: 'Experience (Years)', type: 'text', icon: IconUser, placeholder: 'e.g. 3-5', required: false },
  { key: 'jobLocation', label: 'Job Location', type: 'text', icon: IconMapPin, placeholder: 'e.g. Bangalore', required: true },
  { key: 'minBudget', label: 'Min Budget', type: 'number', icon: IconWallet, placeholder: 'e.g. 50000', required: false, min: 0 },
  { key: 'maxBudget', label: 'Max Budget', type: 'number', icon: IconWallet, placeholder: 'e.g. 80000', required: false, min: 0 },
  { key: 'durationMonths', label: 'Duration (Months)', type: 'number', icon: IconClock, placeholder: 'e.g. 6', required: false, min: 1 },
  { key: 'remarks', label: 'Job Description', type: 'text', icon: IconBriefcase, placeholder: 'Optional job description', required: false },
];

function findByName(list, name) {
  const needle = String(name || '').trim().toLowerCase();
  if (!needle) return null;
  return list.find((item) => String(item.name || '').trim().toLowerCase() === needle) || null;
}

function normalizeMemberList(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function memberLoadError(err, fallback) {
  const raw = err?.response?.data?.message || err?.message || fallback;
  return Array.isArray(raw) ? raw.join('; ') : String(raw);
}

export default function AddRequestScreen() {
  const { user } = useAuth();
  const isSales = user?.userType === 'sales';
  const canAssign = ['admin', 'sales', 'sales_lead'].includes(user?.userType);

  const [form, setForm] = useState(EMPTY);
  const [jobFamilies, setJobFamilies] = useState([]);
  const [clients, setClients] = useState([]);
  const [salesMembers, setSalesMembers] = useState([]);
  const [taMembers, setTaMembers] = useState([]);
  const [taLeadMembers, setTaLeadMembers] = useState([]);
  const [assignMode, setAssignMode] = useState('none'); // none | lead | owners
  const [taLeadIds, setTaLeadIds] = useState([]);
  const [taOwnerIds, setTaOwnerIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [taLeadLoadError, setTaLeadLoadError] = useState(null);

  const loadTaLeadMembers = useCallback(async () => {
    const url = ENDPOINTS.TA_LEAD_MEMBERS;
    if (!url) {
      setTaLeadLoadError('TA Lead members endpoint is not configured.');
      setTaLeadMembers([]);
      return [];
    }
    try {
      const res = await get(url);
      const list = normalizeMemberList(res);
      setTaLeadMembers(list);
      setTaLeadLoadError(null);
      return list;
    } catch (err) {
      setTaLeadMembers([]);
      setTaLeadLoadError(memberLoadError(err, 'Failed to load TA Lead users.'));
      return [];
    }
  }, []);

  const loadTaMembers = useCallback(async () => {
    const url = ENDPOINTS.TA_MEMBERS;
    if (!url) {
      setTaMembers([]);
      return [];
    }
    try {
      const res = await get(url);
      const list = normalizeMemberList(res);
      setTaMembers(list);
      return list;
    } catch {
      setTaMembers([]);
      return [];
    }
  }, []);

  useEffect(() => {
    let active = true;
    get(ENDPOINTS.JOB_FAMILIES)
      .then((res) => active && setJobFamilies(Array.isArray(res) ? res : res?.data || []))
      .catch(() => active && setJobFamilies([]));
    get(ENDPOINTS.CLIENTS)
      .then((res) => active && setClients(Array.isArray(res) ? res : res?.data || []))
      .catch(() => active && setClients([]));
    get(ENDPOINTS.SALES_MEMBERS)
      .then((res) => {
        if (!active) return;
        setSalesMembers(normalizeMemberList(res));
      })
      .catch(() => active && setSalesMembers([]));
    return () => { active = false; };
  }, []);

  // Load TA / TA Lead members after auth is ready and role can assign.
  useEffect(() => {
    if (!canAssign || !user?.id) return undefined;
    let cancelled = false;
    (async () => {
      await Promise.all([loadTaMembers(), loadTaLeadMembers()]);
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [canAssign, user?.id, loadTaMembers, loadTaLeadMembers]);

  // Prefill sales owner for logged-in Sales users.
  useEffect(() => {
    if (!isSales || !user?.id || !salesMembers.length) return;
    const me = salesMembers.find((m) => String(m.id) === String(user.id));
    if (me) {
      setForm((f) => (f.salesOwnerId ? f : { ...f, salesOwnerId: me.id }));
    }
  }, [isSales, user?.id, salesMembers]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setMode = (mode) => {
    setAssignMode(mode);
    setTaLeadIds([]);
    setTaOwnerIds([]);
    if (mode === 'lead' && taLeadMembers.length === 0) {
      void loadTaLeadMembers();
    }
  };

  const ensureMasterRecord = async (list, setList, name, createUrl) => {
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new Error('Name is required');
    const existing = findByName(list, trimmed);
    if (existing) return existing.id;

    const created = await post(createUrl, { name: trimmed });
    const row = created?.id ? created : created?.data || created;
    if (!row?.id) throw new Error(`Failed to create "${trimmed}"`);
    setList((prev) => (findByName(prev, row.name || trimmed) ? prev : [...prev, row]));
    return row.id;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const missing = FIELDS.filter((f) => {
      if (!f.required) return false;
      return !String(form[f.key]).trim();
    });
    if (missing.length) {
      setError(`Please fill: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }
    if (!salesMembers.length) {
      setError('No Sales users found. Create a Sales user from Admin first.');
      return;
    }
    if (assignMode === 'lead' && !taLeadIds.length) {
      setError('Select at least one TA Lead, or choose a different assignment mode.');
      return;
    }
    if (assignMode === 'owners' && !taOwnerIds.length) {
      setError('Select at least one TA Owner, or choose a different assignment mode.');
      return;
    }

    setSubmitting(true);
    try {
      const toInt = (v) => {
        if (v === '' || v == null) return undefined;
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : undefined;
      };
      const toNum = (v) => {
        if (v === '' || v == null) return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      };

      const clientId = await ensureMasterRecord(
        clients,
        setClients,
        form.clientName,
        ENDPOINTS.CLIENTS,
      );
      const jobFamilyId = await ensureMasterRecord(
        jobFamilies,
        setJobFamilies,
        form.jobFamilyName,
        ENDPOINTS.JOB_FAMILIES,
      );

      const payload = {
        requirementDate: form.requirementDate,
        clientId,
        roleSkill: form.roleSkill,
        jobFamilyId,
        numberOfPositions: toInt(form.numberOfPositions),
        salesOwnerId: form.salesOwnerId,
        priorityCode: form.priorityCode,
        taHandoffDate: form.taHandoffDate || undefined,
        targetClosureDate: form.targetClosureDate || undefined,
        remarks: form.remarks || undefined,
        experience: form.experience || undefined,
        jobLocation: form.jobLocation,
        minBudget: toNum(form.minBudget),
        maxBudget: toNum(form.maxBudget),
        durationMonths: toInt(form.durationMonths),
        ...(canAssign && assignMode === 'lead' ? { taLeadIds, taOwnerIds: [] } : {}),
        ...(canAssign && assignMode === 'owners' ? { taOwnerIds, taLeadIds: [] } : {}),
        ...(canAssign && assignMode === 'none' ? { taOwnerIds: [], taLeadIds: [] } : {}),
      };
      const res = await post(ENDPOINTS.ADD_REQUEST, payload);
      addRequirement({
        id: res?.request?.id || res?.id,
        status: res?.request?.status || 'Submitted',
        clientName: form.clientName.trim(),
        jobFamilyName: form.jobFamilyName.trim(),
        ...payload,
      });
      const okMsg =
        assignMode === 'owners'
          ? 'Requirement created and assigned to TA owner(s).'
          : assignMode === 'lead'
            ? 'Requirement created and sent to TA Lead(s) for TA assignment.'
            : 'Requirement created. All TA Leads have been notified.';
      setSuccess(res.message || okMsg);
      setForm({ ...EMPTY, ...(isSales && user?.id ? { salesOwnerId: user.id } : {}) });
      setMode('none');
    } catch (err) {
      const raw = err?.response?.data?.message || err?.message || 'Failed to submit request. Please try again.';
      setError(Array.isArray(raw) ? raw.join('; ') : String(raw));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ ...EMPTY, ...(isSales && user?.id ? { salesOwnerId: user.id } : {}) });
    setMode('none');
    setError(null);
    setSuccess(null);
    setTaLeadLoadError(null);
  };

  return (
    <div className="add-request">
      <PageHeader
        icon={IconPlus}
        title="Add Recruitment Request"
        subtitle="Fill in the details below. Optionally assign via TA Lead or directly to TA owner(s)."
      />

      <form className="add-request-form" onSubmit={handleSubmit}>
        <div className="add-request-grid">
          {FIELDS.map((f) => (
            <label key={f.key} className="add-field">
              <span className="add-label">
                <f.icon />
                {f.label}
                {f.required && <em className="req">*</em>}
              </span>
              {f.type === 'select' ? (
                <select value={form[f.key]} onChange={(e) => update(f.key, e.target.value)}>
                  <option value="">Select {f.label}…</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === 'combobox-client' ? (
                <>
                  <input
                    list="client-options"
                    value={form.clientName}
                    placeholder={f.placeholder}
                    autoComplete="off"
                    onChange={(e) => update('clientName', e.target.value)}
                  />
                  <datalist id="client-options">
                    {clients.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </>
              ) : f.type === 'combobox-jobfamily' ? (
                <>
                  <input
                    list="jobfamily-options"
                    value={form.jobFamilyName}
                    placeholder={f.placeholder}
                    autoComplete="off"
                    onChange={(e) => update('jobFamilyName', e.target.value)}
                  />
                  <datalist id="jobfamily-options">
                    {jobFamilies.map((jf) => (
                      <option key={jf.id} value={jf.name} />
                    ))}
                  </datalist>
                </>
              ) : f.type === 'select-owner' ? (
                <select
                  value={form[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  disabled={isSales}
                >
                  <option value="">Select {f.label}…</option>
                  {salesMembers.map((u) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type}
                  value={form[f.key]}
                  placeholder={f.placeholder}
                  min={f.min}
                  onChange={(e) => {
                    if (f.min === 0 && Number(e.target.value) < 0) return;
                    update(f.key, e.target.value);
                  }}
                />
              )}
            </label>
          ))}
        </div>

        {canAssign && (
          <div className="assign-mode-block">
            <span className="add-label"><IconUser /> TA assignment</span>
            <div className="assign-mode-row">
              <label className={`assign-mode-opt${assignMode === 'none' ? ' is-active' : ''}`}>
                <input
                  type="radio"
                  name="assignMode"
                  checked={assignMode === 'none'}
                  onChange={() => setMode('none')}
                />
                Unassigned (notify all TA Leads)
              </label>
              <label className={`assign-mode-opt${assignMode === 'lead' ? ' is-active' : ''}`}>
                <input
                  type="radio"
                  name="assignMode"
                  checked={assignMode === 'lead'}
                  onChange={() => setMode('lead')}
                />
                Via TA Lead
              </label>
              <label className={`assign-mode-opt${assignMode === 'owners' ? ' is-active' : ''}`}>
                <input
                  type="radio"
                  name="assignMode"
                  checked={assignMode === 'owners'}
                  onChange={() => setMode('owners')}
                />
                Direct TA Owner(s)
              </label>
            </div>
            {assignMode === 'lead' && (
              <div className="assign-mode-select">
                <TaOwnersMultiSelect
                  options={taLeadMembers}
                  value={taLeadIds}
                  onChange={setTaLeadIds}
                  idPrefix="create-ta-lead"
                  placeholder="Select TA Lead(s)…"
                  emptyMessage={
                    taLeadLoadError
                      ? taLeadLoadError
                      : 'No TA Lead users found. Create a TA Lead from Admin first.'
                  }
                  ariaLabel="TA Leads"
                />
                {taLeadLoadError && (
                  <div className="add-error mt-sm inline-actions">
                    {taLeadLoadError}
                    <button
                      type="button"
                      className="filter-clear"
                      onClick={() => void loadTaLeadMembers()}
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            )}
            {assignMode === 'owners' && (
              <div className="assign-mode-select">
                <TaOwnersMultiSelect
                  options={taMembers}
                  value={taOwnerIds}
                  onChange={setTaOwnerIds}
                  idPrefix="create-ta-owner"
                  placeholder="Select TA owner(s)…"
                  emptyMessage="No TA users found. Create a TA user from Admin first."
                  ariaLabel="TA owners"
                />
              </div>
            )}
          </div>
        )}

        {error && <div className="add-error">{error}</div>}
        {success && <div className="add-success">{success}</div>}

        <div className="add-actions">
          <button type="submit" className="add-submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
          <button type="button" className="add-reset" onClick={resetForm}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
