import { useEffect, useState } from 'react';
import { get } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { IconBriefcase } from '../../components/Icons';

export default function MyTasksScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [candidatesMap, setCandidatesMap] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [viewingCandidate, setViewingCandidate] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([get(ENDPOINTS.REQUIREMENTS), get(ENDPOINTS.CANDIDATES)])
      .then(([reqRes, candRes]) => {
        if (!active) return;
        const reqList = Array.isArray(reqRes) ? reqRes : reqRes?.items || reqRes?.data || [];
        const candList = Array.isArray(candRes) ? candRes : candRes?.items || candRes?.data || [];
        const email = user?.email?.toLowerCase?.();
        const salesOnly = (r) => r.salesOwner?.email?.toLowerCase?.() === email;
        const owned = reqList.filter(salesOnly).map((r) => ({
          id: r.id,
          publicId: r.publicId,
          clientName: r.client?.name || '—',
          roleSkill: r.roleSkill || '—',
        }));
        setTasks(owned);
        // prepare a candidate map keyed by requirement id so we can show counts quickly
        const map = {};
        owned.forEach((r) => {
          map[r.id] = candList.filter((c) => c.requirementId === r.id || c.requirement?.id === r.id);
        });
        setCandidatesMap(map);
      })
      .catch(() => active && setTasks([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user]);

  const toggleCandidates = async (req) => {
    const id = req.id;
    if (candidatesMap[id]) {
      // collapse
      setCandidatesMap((m) => { const copy = { ...m }; delete copy[id]; return copy; });
      return;
    }
    setLoadingMap((m) => ({ ...m, [id]: true }));
    try {
      const res = await get(ENDPOINTS.CANDIDATES);
      const list = Array.isArray(res) ? res : res?.items || res?.data || [];
      const filtered = list.filter((c) => c.requirementId === id || c.requirement?.id === id);
      setCandidatesMap((m) => ({ ...m, [id]: filtered }));
    } catch (err) {
      setCandidatesMap((m) => ({ ...m, [id]: [] }));
    } finally {
      setLoadingMap((m) => ({ ...m, [id]: false }));
    }
  };

  const openCandidateDetails = (candidate) => setViewingCandidate(candidate);
  const closeCandidateDetails = () => setViewingCandidate(null);

  if (loading) return <div className="screen-loading"><div className="spinner" /></div>;

  return (
    <div className="my-tasks-screen">
      <div className="assign-head">
        <span className="assign-badge"><IconBriefcase /></span>
        <div>
          <h2 className="assign-title">Task History</h2>
          <p className="assign-sub">Requirements assigned to you (sales owner).</p>
        </div>
      </div>
      <div className="my-tasks-grid">
        {tasks.length === 0 && <div className="cand-empty">Not found</div>}
        {tasks.map((t) => (
          <div key={t.id} className="my-task-card">
            <div className="mt-head">
              <div className="mt-title">{t.publicId || t.id}</div>
              <div className="mt-client">{t.clientName}</div>
            </div>
            <div className="mt-meta">
              <div>{t.roleSkill}</div>
              <button className="cand-edit" onClick={() => toggleCandidates(t)}>
                {loadingMap[t.id] ? 'Loading…' : (candidatesMap[t.id] ? 'Hide' : `Candidates (${(candidatesMap[t.id]||[]).length})`)}
              </button>
            </div>
            {candidatesMap[t.id] && (
              <div className="mt-candidate-table-wrap">
                <table className="mt-candidate-table">
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Stage</th>
                      <th>Status</th>
                      <th>Profile Submitted</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {candidatesMap[t.id].length === 0 && (
                      <tr><td colSpan={7} className="cand-empty">No candidates found.</td></tr>
                    )}
                    {candidatesMap[t.id].map((c) => (
                      <tr key={c.publicId || c.id}>
                        <td>{c.name || c.candidateName || c.email}</td>
                        <td>{c.email || '—'}</td>
                        <td>{c.mobile || '—'}</td>
                        <td>{c.stageCode || c.candidateStage || '—'}</td>
                        <td>{c.candidateStatus || c.feedbackStatus || '—'}</td>
                        <td>{(c.profileSubmittedDate || '').slice(0, 10) || '—'}</td>
                        <td>
                          <button className="cand-edit" type="button" onClick={() => openCandidateDetails(c)}>
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {viewingCandidate && (
        <div className="modal-overlay" onClick={closeCandidateDetails}>
          <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Candidate Details — {viewingCandidate.candidateId || viewingCandidate.publicId || viewingCandidate.id}</h3>
              <button className="modal-close" onClick={closeCandidateDetails} title="Close">×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-field"><span className="detail-label">Candidate ID</span><input value={viewingCandidate.candidateId || ''} readOnly /></div>
                <div className="detail-field"><span className="detail-label">Public ID</span><input value={viewingCandidate.publicId || ''} readOnly /></div>
                <div className="detail-field"><span className="detail-label">Internal ID</span><input value={viewingCandidate.id || ''} readOnly /></div>
                <div className="detail-field"><span className="detail-label">Req ID</span><input value={viewingCandidate.requirementId || viewingCandidate.reqId || ''} readOnly /></div>
                <div className="detail-field"><span className="detail-label">Candidate Name</span><input value={viewingCandidate.name || viewingCandidate.candidateName || ''} readOnly /></div>
                <div className="detail-field"><span className="detail-label">Email</span><input value={viewingCandidate.email || ''} readOnly /></div>
                <div className="detail-field"><span className="detail-label">Mobile</span><input value={viewingCandidate.mobile || ''} readOnly /></div>
                <div className="detail-field"><span className="detail-label">Source</span><input value={viewingCandidate.source || ''} readOnly /></div>
                <div className="detail-field"><span className="detail-label">Candidate Stage</span><input value={viewingCandidate.stageCode || viewingCandidate.candidateStage || ''} readOnly /></div>
                <div className="detail-field"><span className="detail-label">Candidate Status</span><input value={viewingCandidate.candidateStatus || viewingCandidate.feedbackStatus || ''} readOnly /></div>
                <div className="detail-field"><span className="detail-label">Profile Submitted</span><input value={(viewingCandidate.profileSubmittedDate || '').slice(0, 10)} readOnly /></div>
                <div className="detail-field"><span className="detail-label">Client Shortlist Date</span><input value={(viewingCandidate.clientShortlistDate || '').slice(0, 10)} readOnly /></div>
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
    </div>
  );
}
