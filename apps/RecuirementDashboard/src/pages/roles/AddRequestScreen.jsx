import { useState, useEffect } from 'react';
import { post, get } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { addRequirement } from '../../services/requirementsStore';
import { IconBriefcase, IconUser, IconTarget, IconFolderOpen, IconWallet, IconMapPin, IconClock, IconPlus, IconCalendar, IconFlag } from '../../components/Icons';

const EMPTY = {
  requirementDate: '',
  clientName: '',
  roleSkill: '',
  jobFamilyName: '',
  numberOfPositions: '',
  salesOwnerId: '',
  priorityCode: 'HIGH',
  taOwnerId: '',
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
  { key: 'taOwnerId', label: 'TA Owner', type: 'select-owner', ownerSource: 'ta', icon: IconUser, required: true },
  { key: 'taHandoffDate', label: 'TA Handoff Date', type: 'date', icon: IconCalendar, required: false },
  { key: 'targetClosureDate', label: 'Target Closure Date', type: 'date', icon: IconCalendar, required: false },
  { key: 'experience', label: 'Experience (Years)', type: 'text', icon: IconUser, placeholder: 'e.g. 3-5', required: false },
  { key: 'jobLocation', label: 'Job Location', type: 'text', icon: IconMapPin, placeholder: 'e.g. Bangalore', required: true },
  { key: 'minBudget', label: 'Min Budget', type: 'number', icon: IconWallet, placeholder: 'e.g. 50000', required: true, min: 0 },
  { key: 'maxBudget', label: 'Max Budget', type: 'number', icon: IconWallet, placeholder: 'e.g. 80000', required: true, min: 0 },
  { key: 'durationMonths', label: 'Duration (Months)', type: 'number', icon: IconClock, placeholder: 'e.g. 6', required: true, min: 1 },
  { key: 'remarks', label: 'Job Description', type: 'text', icon: IconBriefcase, placeholder: 'Optional job description', required: false },
];

function findByName(list, name) {
  const needle = String(name || '').trim().toLowerCase();
  if (!needle) return null;
  return list.find((item) => String(item.name || '').trim().toLowerCase() === needle) || null;
}

export default function AddRequestScreen() {
  const [form, setForm] = useState(EMPTY);
  const [jobFamilies, setJobFamilies] = useState([]);
  const [clients, setClients] = useState([]);
  const [users, setUsers] = useState([]);
  const [salesMembers, setSalesMembers] = useState([]);
  const [taMembers, setTaMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  // Load job families, clients, and users for the dropdowns.
  useEffect(() => {
    let active = true;
    get(ENDPOINTS.JOB_FAMILIES)
      .then((res) => active && setJobFamilies(Array.isArray(res) ? res : res?.data || []))
      .catch(() => active && setJobFamilies([]));
    get(ENDPOINTS.CLIENTS)
      .then((res) => active && setClients(Array.isArray(res) ? res : res?.data || []))
      .catch(() => active && setClients([]));
    get(ENDPOINTS.USERS)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        active && setUsers(list);
      })
      .catch(() => active && setUsers([]));
    get(ENDPOINTS.SALES_MEMBERS)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        active && setSalesMembers(list);
      })
      .catch(() => active && setSalesMembers([]));
    get(ENDPOINTS.TA_MEMBERS)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        active && setTaMembers(list);
      })
      .catch(() => active && setTaMembers([]));
    return () => { active = false; };
  }, []);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

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

    const missing = FIELDS.filter((f) => f.required && !String(form[f.key]).trim());
    if (missing.length) {
      setError(`Please fill: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }
    if (!salesMembers.length) {
      setError('No Sales users found. Create a Sales user from Admin first.');
      return;
    }
    if (!taMembers.length) {
      setError('No TA users found. Create a TA user from Admin first.');
      return;
    }

    setSubmitting(true);
    try {
      const toInt = (v) => {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : undefined;
      };
      const toNum = (v) => {
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
      console.log('[AddRequest] payload ->', payload);
      const res = await post(ENDPOINTS.ADD_REQUEST, payload);
      // Persist locally so the Sales screen can list "My Requirements".
      addRequirement({
        id: res?.request?.id || res?.id,
        status: res?.request?.status || 'Submitted',
        clientName: form.clientName.trim(),
        jobFamilyName: form.jobFamilyName.trim(),
        ...payload,
      });
      setSuccess(res.message || 'Requirement created successfully');
      setForm(EMPTY);
    } catch (err) {
      const raw = err?.response?.data?.message || err?.message || 'Failed to submit request. Please try again.';
      setError(Array.isArray(raw) ? raw.join('; ') : String(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="add-request">
      <div className="add-request-head">
        <span className="add-request-badge"><IconPlus /></span>
        <div>
          <h2 className="add-request-title">Add Recruitment Request</h2>
          <p className="add-request-sub">Fill in the details below to raise a new hiring request.</p>
        </div>
      </div>

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
                <select value={form[f.key]} onChange={(e) => update(f.key, e.target.value)}>
                  <option value="">Select {f.label}…</option>
                  {(f.ownerSource === 'sales' ? salesMembers : f.ownerSource === 'ta' ? taMembers : users.filter((u) => u.role === f.ownerRole)).map((u) => (
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
                    // Block negative values for numeric fields.
                    if (f.min === 0 && Number(e.target.value) < 0) return;
                    update(f.key, e.target.value);
                  }}
                />
              )}
            </label>
          ))}
        </div>

        {error && <div className="add-error">{error}</div>}
        {success && <div className="add-success">{success}</div>}

        <div className="add-actions">
          <button type="submit" className="add-submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
          <button type="button" className="add-reset" onClick={() => { setForm(EMPTY); setError(null); setSuccess(null); }}>
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
