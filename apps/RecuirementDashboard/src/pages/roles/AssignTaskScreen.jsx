import { useEffect, useState } from 'react';
import { get, post, patch } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import {
  IconClipboardCheck, IconBriefcase, IconUser, IconTarget, IconFolderOpen,
  IconWallet, IconMapPin, IconClock, IconPlus, IconEdit,
} from '../../components/Icons';

// Columns shown in the candidate table (editable on the same screen).
const CANDIDATE_FIELDS = [
  { key: 'candidateId', label: 'Candidate ID', type: 'text', required: false, locked: true },
  { key: 'reqId', label: 'Req ID', type: 'text', required: true },
  { key: 'position', label: 'Position', type: 'text', required: true },
  { key: 'jobFamily', label: 'Job Family', type: 'text', required: true },
  { key: 'candidateName', label: 'Candidate Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'text', required: true },
  { key: 'mobile', label: 'Mobile Number', type: 'text', required: true },
  { key: 'source', label: 'Source', type: 'text', required: true },
  { key: 'candidateStage', label: 'Candidate Stage', type: 'text', required: true },
  { key: 'feedbackStatus', label: 'Candidate Status', type: 'select', required: true, optionsKey: 'candidateStatuses' },
  { key: 'profileSubmittedDate', label: 'Profile Submitted Date', type: 'date', required: true },
  { key: 'clientShortlistDate', label: 'Client Shortlist Date', type: 'date', required: false },
  { key: 'interviewRound', label: 'Interview Round', type: 'text', required: false },
  { key: 'remarks', label: 'Remarks', type: 'text', required: false },
];

const EMPTY_CANDIDATE = Object.fromEntries(CANDIDATE_FIELDS.map((f) => [f.key, '']));

export default function AssignTaskScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // candidate being edited
  const [viewingCandidate, setViewingCandidate] = useState(null);
  const [form, setForm] = useState(EMPTY_CANDIDATE);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [candidateStatuses, setCandidateStatuses] = useState([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      get(ENDPOINTS.REQUIREMENTS),
      get(ENDPOINTS.CANDIDATES),
    ])
      .then(([reqRes, candRes]) => {
        if (!active) return;
        const reqList = Array.isArray(reqRes) ? reqRes : reqRes?.items || reqRes?.data || [];
        const candList = Array.isArray(candRes) ? candRes : candRes?.items || candRes?.data || [];
        // Map the requirements API response into the task-card shape used below.
        const mapped = reqList
          .filter((r) => {
            const currentEmail = user?.email?.toLowerCase?.();
            const isSales = user?.userType === 'sales';
            const isTa = user?.userType === 'ta_owner';
            const matchEmail = isSales
              ? r.salesOwner?.email?.toLowerCase?.()
              : isTa
                ? r.taOwner?.email?.toLowerCase?.()
                : null;
            return !currentEmail || !matchEmail || currentEmail === matchEmail;
          })
          .map((r) => ({
            id: r.id,
            publicId: r.publicId,
            clientName: r.client?.name || '—',
            position: r.roleSkill || '—',
            taOwner: r.taOwner?.fullName || '—',
            salesOwner: r.salesOwner?.fullName || '—',
            noOfPositions: r.numberOfPositions ?? '—',
            jobFamily: r.jobFamily?.name || '—',
            minBudget: r.minBudget ?? '—',
            maxBudget: r.maxBudget ?? '—',
            jobLocation: r.jobLocation || '—',
            duration: r.durationMonths ?? '—',
            status: r.status || 'ACTIVE',
            // Pull candidates for this requirement from the candidate list API.
            candidates: candList
              .filter((c) => c.requirementId === r.id)
              .map((c) => ({
                id: c.id,
                candidateId: c.publicId || c.id,
                publicId: c.publicId,
                requirementId: r.id,
                reqId: r.publicId || r.id,
                position: c.requirement?.roleSkill || r.roleSkill || '—',
                jobFamily: r.jobFamily?.name || '—',
                candidateName: c.name,
                email: c.email,
                mobile: c.mobile,
                source: c.source,
                candidateStage: c.stageCode,
                feedbackStatus: c.candidateStatus,
                profileSubmittedDate: (c.profileSubmittedDate || '').slice(0, 10),
                clientShortlistDate: (c.clientShortlistDate || '').slice(0, 10),
                interviewRound: c.interviewRound || '',
                remarks: c.remarks || '',
              })),
          }));
        setTasks(mapped);
        if (mapped.length) setSelectedTaskId(mapped[0].id);
      })
      .catch(() => active && setTasks([]))
      .finally(() => active && setLoading(false));
    // Fetch candidate status options for the dropdown.
    get(ENDPOINTS.CANDIDATE_STATUS)
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.items || res?.data || [];
        active && setCandidateStatuses(list);
      })
      .catch(() => active && setCandidateStatuses([]));
    return () => { active = false; };
  }, []);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  const openAdd = (task) => {
    setEditing(null);
    setForm({
      ...EMPTY_CANDIDATE,
      candidateId: 'C-' + String(Date.now()).slice(-6),
      requirementId: task.id,
      reqId: task.publicId || task.id,
      position: task.position,
      jobFamily: task.jobFamily,
    });
    setError(null); setSuccess(null); setShowForm(true);
  };

  const openEdit = (cand) => {
    setEditing(cand.id);
    setForm({ ...EMPTY_CANDIDATE, ...cand, id: cand.id, requirementId: cand.requirementId || cand.reqId });
    setError(null); setSuccess(null); setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_CANDIDATE); };
  const openCandidateDetails = (candidate) => setViewingCandidate(candidate);
  const closeCandidateDetails = () => setViewingCandidate(null);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null);
    const missing = CANDIDATE_FIELDS.filter((f) => f.required && !String(form[f.key]).trim());
    if (missing.length) {
      setError(`Please fill: ${missing.map((m) => m.label).join(', ')}`);
      return;
    }
    // Shared fields for POST /api/v1/candidates and PATCH /api/v1/candidates/{id}.
    // Empty optional dates/strings become null so the API can clear or skip them.
    const sharedPayload = {
      name: form.candidateName,
      mobile: form.mobile,
      email: form.email,
      source: form.source || null,
      position: form.position || null,
      jobFamily: form.jobFamily || null,
      stageCode: form.candidateStage || 'SUBMITTED_TO_SPOC',
      candidateStatus: form.feedbackStatus,
      profileSubmittedDate: form.profileSubmittedDate || null,
      clientShortlistDate: form.clientShortlistDate || null,
      interviewRound: form.interviewRound || null,
      remarks: form.remarks || null,
    };
    try {
      let res;
      if (editing) {
        const candidateId = editing || form.id;
        // UpdateCandidateDto does not accept requirementId (forbidNonWhitelisted).
        res = await patch(`${ENDPOINTS.UPDATE_CANDIDATE}/${candidateId}`, sharedPayload);
        setSuccess(res.message || 'Candidate updated');
        setTasks((prev) => prev.map((t) => {
          if (t.id !== form.requirementId) return t;
          return {
            ...t,
            candidates: t.candidates.map((c) =>
              c.id === candidateId ? {
                ...c,
                ...{
                  position: form.position,
                  jobFamily: form.jobFamily,
                  candidateName: form.candidateName,
                  email: form.email,
                  mobile: form.mobile,
                  source: form.source,
                  candidateStage: form.candidateStage,
                  feedbackStatus: form.feedbackStatus,
                  profileSubmittedDate: form.profileSubmittedDate,
                  clientShortlistDate: form.clientShortlistDate,
                  interviewRound: form.interviewRound,
                  remarks: form.remarks,
                },
              } : c
            ),
          };
        }));
      } else {
        res = await post(ENDPOINTS.ADD_CANDIDATE, {
          ...sharedPayload,
          requirementId: form.requirementId || form.reqId,
        });
        setSuccess(res.message || 'Candidate added');
        // Add the new candidate to the local task so it shows in the table.
        const newCand = {
          id: res?.candidate?.id || form.id || form.candidateId,
          candidateId: res?.candidate?.publicId || res?.candidate?.id || form.candidateId,
          publicId: res?.candidate?.publicId || res?.candidate?.id || form.candidateId,
          requirementId: form.requirementId,
          reqId: form.reqId,
          position: form.position,
          jobFamily: form.jobFamily,
          candidateName: form.candidateName,
          email: form.email,
          mobile: form.mobile,
          source: form.source,
          candidateStage: form.candidateStage,
          feedbackStatus: form.feedbackStatus,
          profileSubmittedDate: form.profileSubmittedDate,
          clientShortlistDate: form.clientShortlistDate,
          interviewRound: form.interviewRound,
          remarks: form.remarks,
        };
        setTasks((prev) => prev.map((t) =>
          t.id === form.requirementId ? { ...t, candidates: [...t.candidates, newCand] } : t
        ));
      }
      closeForm();
    } catch (err) {
      setError('Failed to save. Please try again.');
    }
  };

  if (loading) return <div className="screen-loading"><div className="spinner" /></div>;

  return (
    <div className="assign-task">
      <div className="assign-head">
        <span className="assign-badge"><IconClipboardCheck /></span>
        <div>
          <h2 className="assign-title">Assign Task</h2>
          <p className="assign-sub">Tasks prefilled by Sales. Click a task to view &amp; manage its candidates.</p>
        </div>
      </div>

      <div className="assign-body">
        {/* Task list (left) */}
        <aside className="task-list">
          <h3 className="task-list-title">Tasks</h3>
          {tasks.map((t) => (
            <button
              key={t.id}
              className={`task-card ${selectedTaskId === t.id ? 'active' : ''}`}
              onClick={() => setSelectedTaskId(t.id)}
            >
              <div className="task-card-top">
                <IconBriefcase />
                <span className="task-client">{t.clientName}</span>
                <span className="task-count">{t.candidates.length}</span>
              </div>
              <div className="task-pos">{t.position}</div>
              <div className="task-meta">
                <span>{t.publicId || t.id}</span>
              </div>
              <div className="task-meta">
                <span><IconUser /> {t.taOwner}</span>
                <span><IconTarget /> {t.noOfPositions} pos</span>
              </div>
              <div className="task-meta">
                <span><IconFolderOpen /> {t.jobFamily}</span>
                <span><IconWallet /> {t.minBudget}–{t.maxBudget}</span>
              </div>
              <div className="task-meta">
                <span><IconMapPin /> {t.jobLocation}</span>
                <span><IconClock /> {t.duration !== '—' ? `${t.duration} years` : '—'}</span>
              </div>
            </button>
          ))}
        </aside>

        {/* Candidate table + form (right) */}
        <section className="task-detail">
          {selectedTask ? (
            <>
              <div className="task-detail-head">
                <div>
                  <h3 className="task-detail-title">{selectedTask.clientName} — {selectedTask.position}</h3>
                  <span className="task-detail-id">{selectedTask.publicId || selectedTask.id}</span>
                </div>
                <button className="add-cand-btn" onClick={() => openAdd(selectedTask)}>
                  <IconPlus /> Add Candidate
                </button>
              </div>

              <div className="cand-table-wrap">
                <table className="cand-table">
                  <thead>
                    <tr>
                      {CANDIDATE_FIELDS.map((f) => (
                        <th key={f.key}>{f.label}</th>
                      ))}
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTask.candidates.length === 0 && (
                      <tr><td colSpan={CANDIDATE_FIELDS.length + 1} className="cand-empty">No candidates yet. Click "Add Candidate".</td></tr>
                    )}
                    {selectedTask.candidates.map((c) => (
                      <tr key={c.candidateId} onClick={() => openCandidateDetails(c)}>
                        {CANDIDATE_FIELDS.map((f) => (
                          <td key={f.key}>
                            {c[f.key] || '—'}
                          </td>
                        ))}
                        <td>
                          <button className="cand-edit" onClick={(e) => { e.stopPropagation(); openEdit(c); }} title="Edit">
                            <IconEdit /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {viewingCandidate && (
                <div className="modal-overlay" onClick={closeCandidateDetails}>
                  <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-head">
                      <h3>Candidate Details — {viewingCandidate.candidateId}</h3>
                      <button className="modal-close" onClick={closeCandidateDetails} title="Close">×</button>
                    </div>
                    <div className="modal-body">
                      <div className="detail-grid">
                        <div className="detail-field"><span className="detail-label">Candidate ID</span><input value={viewingCandidate.candidateId || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Public ID</span><input value={viewingCandidate.publicId || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Req ID</span><input value={viewingCandidate.reqId || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Position</span><input value={viewingCandidate.position || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Job Family</span><input value={viewingCandidate.jobFamily || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Candidate Name</span><input value={viewingCandidate.candidateName || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Email</span><input value={viewingCandidate.email || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Mobile</span><input value={viewingCandidate.mobile || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Source</span><input value={viewingCandidate.source || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Candidate Stage</span><input value={viewingCandidate.candidateStage || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Candidate Status</span><input value={viewingCandidate.feedbackStatus || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Profile Submitted</span><input value={viewingCandidate.profileSubmittedDate || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Client Shortlist Date</span><input value={viewingCandidate.clientShortlistDate || ''} readOnly /></div>
                        <div className="detail-field"><span className="detail-label">Interview Round</span><input value={viewingCandidate.interviewRound || ''} readOnly /></div>
                        <div className="detail-field full"><span className="detail-label">Remarks</span><textarea value={viewingCandidate.remarks || ''} readOnly /></div>
                      </div>
                    </div>
                    <div className="modal-foot">
                      <button type="button" className="filter-clear" onClick={closeCandidateDetails}>Close</button>
                    </div>
                  </div>
                </div>
              )}
              {showForm && (
                <form className="cand-form" onSubmit={handleSubmit}>
                  <h4 className="cand-form-title">{editing ? 'Edit Candidate' : 'Add Candidate'}</h4>
                  <div className="cand-form-grid">
                    {CANDIDATE_FIELDS.map((f) => {
                      const options = f.optionsKey ? (f.optionsKey === 'candidateStatuses' ? candidateStatuses : []) : [];
                      const renderedOptions = f.key === 'feedbackStatus' && form[f.key]
                        ? Array.from(new Set([form[f.key], ...options]))
                        : options;
                      return (
                      <label key={f.key} className="cand-field">
                        <span>{f.label}{f.required && <em className="req">*</em>}</span>
                        {f.type === 'select' ? (
                          <select
                            name={f.key}
                            value={form[f.key] ?? ''}
                            disabled={f.locked}
                            onChange={(e) => update(f.key, e.target.value)}
                          >
                            <option value="">Select…</option>
                            {renderedOptions.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            name={f.key}
                            type={f.type}
                            value={form[f.key]}
                            disabled={f.locked}
                            onChange={(e) => update(f.key, e.target.value)}
                          />
                        )}
                      </label>
                      );
                    })}
                  </div>
                  {error && <div className="add-error">{error}</div>}
                  {success && <div className="add-success">{success}</div>}
                  <div className="add-actions">
                    <button type="submit" className="add-submit">{editing ? 'Update' : 'Save Candidate'}</button>
                    <button type="button" className="add-reset" onClick={closeForm}>Cancel</button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="cand-empty">Select a task to view candidates.</div>
          )}
        </section>
      </div>
    </div>
  );
}
