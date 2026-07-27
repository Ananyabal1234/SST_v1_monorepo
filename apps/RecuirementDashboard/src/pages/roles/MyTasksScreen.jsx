import { useEffect, useState } from 'react';
import { get } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { IconBriefcase, IconClipboardCheck } from '../../components/Icons';
import RequirementPipelineBoard from '../../components/RequirementPipelineBoard';

export default function MyTasksScreen() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pipelineReq, setPipelineReq] = useState(null);
  const [viewingCandidate, setViewingCandidate] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    get(ENDPOINTS.REQUIREMENTS)
      .then((reqRes) => {
        if (!active) return;
        const reqList = Array.isArray(reqRes) ? reqRes : reqRes?.items || reqRes?.data || [];
        const email = user?.email?.toLowerCase?.();
        const salesOnly = (r) => r.salesOwner?.email?.toLowerCase?.() === email;
        const owned = reqList.filter(salesOnly).map((r) => {
          const numberOfPositions = Number(r.numberOfPositions) || 0;
          const closedPositions = Number(r.closedPositions) || 0;
          return {
            ...r,
            id: r.id,
            publicId: r.publicId,
            clientName: r.client?.name || '—',
            roleSkill: r.roleSkill || '—',
            numberOfPositions,
            closedPositions,
            isCompleted: numberOfPositions > 0 && closedPositions >= numberOfPositions,
          };
        });
        setTasks(owned);
      })
      .catch(() => active && setTasks([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user]);

  if (loading) return <div className="screen-loading"><div className="spinner" /></div>;

  return (
    <div className="my-tasks-screen">
      <div className="assign-head">
        <span className="assign-badge"><IconBriefcase /></span>
        <div>
          <h2 className="assign-title">Task History</h2>
          <p className="assign-sub">Your requirements — open the candidate pipeline to track recruiting progress (view only).</p>
        </div>
      </div>
      <div className="my-tasks-grid">
        {tasks.length === 0 && <div className="cand-empty">Not found</div>}
        {tasks.map((t) => (
          <div
            key={t.id}
            className={`my-task-card${t.isCompleted ? ' my-task-card--completed' : ''}`}
          >
            <div className="mt-head">
              <div className="mt-title">{t.publicId || '—'}</div>
              <div className="mt-client">{t.clientName}</div>
            </div>
            <div className="mt-meta">
              <div>
                {t.roleSkill}
                {t.isCompleted && (
                  <span className="mt-completed-badge">
                    {' '}· Completed ({t.closedPositions}/{t.numberOfPositions})
                  </span>
                )}
              </div>
              <button className="cand-edit" type="button" onClick={() => setPipelineReq(t)}>
                <IconClipboardCheck /> View pipeline
              </button>
            </div>
          </div>
        ))}
      </div>

      {pipelineReq && (
        <div className="modal-overlay" onClick={() => { setPipelineReq(null); setViewingCandidate(null); }}>
          <div className="modal-card detail-modal pipeline-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Candidate pipeline — {pipelineReq.publicId || pipelineReq.id}</h3>
              <button className="modal-close" onClick={() => { setPipelineReq(null); setViewingCandidate(null); }} title="Close">×</button>
            </div>
            <div className="modal-body">
              <RequirementPipelineBoard
                requirementId={pipelineReq.id}
                requirement={pipelineReq}
                mode="readonly"
                onViewCandidate={(c) => setViewingCandidate(c)}
              />
            </div>
            <div className="modal-foot">
              <button type="button" className="filter-clear" onClick={() => { setPipelineReq(null); setViewingCandidate(null); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {viewingCandidate && (
        <div className="modal-overlay" onClick={() => setViewingCandidate(null)}>
          <div className="modal-card detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Candidate — {viewingCandidate.publicId || viewingCandidate.name}</h3>
              <button className="modal-close" onClick={() => setViewingCandidate(null)} title="Close">×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid detail-grid-2">
                <div className="detail-item"><span className="detail-label">Name</span><span className="detail-value">{viewingCandidate.name || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Email</span><span className="detail-value">{viewingCandidate.email || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Mobile</span><span className="detail-value">{viewingCandidate.mobile || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Stage</span><span className="detail-value">{viewingCandidate.pipelineLabel || viewingCandidate.stageCode || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Offer</span><span className="detail-value">{viewingCandidate.offer?.statusCode || '—'}</span></div>
                <div className="detail-item"><span className="detail-label">Onboarding</span><span className="detail-value">{viewingCandidate.onboarding?.statusCode || '—'}</span></div>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="filter-clear" onClick={() => setViewingCandidate(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
