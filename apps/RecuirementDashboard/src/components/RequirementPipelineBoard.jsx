import { useCallback, useEffect, useMemo, useState } from 'react';
import { get } from '../services/apiClient';
import { ENDPOINTS } from '../config/api';
import {
  PIPELINE_COLUMNS,
  cardSubtitle,
  derivePipelineStage,
  groupByPipelineStage,
} from '../utils/pipelineStage';
import { IconClipboardCheck, IconPlus } from './Icons';
import RequirementNotes from './RequirementNotes';

/**
 * Shared requirement candidate pipeline board.
 * @param {'readonly'|'edit'} mode — Sales uses readonly; TA/Admin use edit
 */
export default function RequirementPipelineBoard({
  requirementId,
  mode = 'readonly',
  requirement: requirementProp = null,
  refreshKey = 0,
  onAddCandidate,
  onEditCandidate,
  onSelectCandidate,
  onViewCandidate,
  onAdvanceStage,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requirement, setRequirement] = useState(requirementProp);
  const [candidates, setCandidates] = useState([]);
  const [summary, setSummary] = useState(null);

  const load = useCallback(() => {
    if (!requirementId) return;
    let active = true;
    setLoading(true);
    setError(null);
    get(`${ENDPOINTS.REQUIREMENT_PIPELINE}/${requirementId}/pipeline`)
      .then((res) => {
        if (!active) return;
        setRequirement(res?.requirement || requirementProp);
        setCandidates(Array.isArray(res?.candidates) ? res.candidates : []);
        setSummary(res?.summary || null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.message || err?.message || 'Failed to load pipeline');
        setCandidates([]);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [requirementId, requirementProp, refreshKey]);

  useEffect(() => {
    const cleanup = load();
    return typeof cleanup === 'function' ? cleanup : undefined;
  }, [load]);

  const grouped = useMemo(() => groupByPipelineStage(candidates), [candidates]);

  const editable = mode === 'edit';
  const req = requirement || requirementProp;
  const recruitingBlocked =
    req?.status === 'ON_HOLD' || req?.status === 'CANCELLED' || req?.status === 'CLOSED';
  const openPositions = summary?.openPositions ?? req?.openPositions ?? '—';
  const closedPositions = summary?.closedPositions ?? req?.closedPositions ?? '—';
  const totalPositions = summary?.numberOfPositions ?? req?.numberOfPositions ?? '—';

  return (
    <div className="pipeline-board">
      <div className="pipeline-board-head">
        <div className="pipeline-board-title-row">
          <span className="pipeline-board-badge"><IconClipboardCheck /></span>
          <div>
            <h3 className="pipeline-board-title">
              {req?.client?.name || req?.clientName || 'Requirement'} — {req?.roleSkill || 'Pipeline'}
            </h3>
            <p className="pipeline-board-sub">
              {req?.publicId || requirementId}
              {' · '}
              Status {req?.status || '—'}
              {' · '}
              Positions {closedPositions}/{totalPositions} filled
              {' · '}
              Open {openPositions}
              {req?.taOwners?.length
                ? ` · TA ${req.taOwners.map((t) => t.fullName).filter(Boolean).join(', ')}`
                : req?.taOwner?.fullName
                  ? ` · TA ${req.taOwner.fullName}`
                  : ''}
              {req?.salesOwner?.fullName ? ` · Sales ${req.salesOwner.fullName}` : ''}
            </p>
          </div>
          {editable && onAddCandidate && !recruitingBlocked && (
            <button type="button" className="add-cand-btn" onClick={() => onAddCandidate(req)}>
              <IconPlus />
              <span>Add candidate</span>
            </button>
          )}
        </div>
        {editable && recruitingBlocked && (
          <div className="pipeline-recruiting-paused">
            {req?.status === 'ON_HOLD'
              ? 'Requirement is on hold — Add Candidate and Select are disabled until resumed.'
              : `Requirement is ${req?.status || 'unavailable'} — recruiting actions are disabled.`}
          </div>
        )}

        {!loading && (
          <div className="pipeline-count-chips">
            {PIPELINE_COLUMNS.map((col) => {
              const count = grouped[col.key]?.length || 0;
              if (!count && (col.key === 'HOLD' || col.key === 'REJECT')) return null;
              return (
                <span key={col.key} className="pipeline-chip">
                  {col.label} <strong>{count}</strong>
                </span>
              );
            })}
            <span className="pipeline-chip pipeline-chip--total">
              Total <strong>{summary?.totalCandidates ?? candidates.length}</strong>
            </span>
          </div>
        )}
      </div>

      {error && <div className="add-error">{Array.isArray(error) ? error.join(', ') : error}</div>}

      {loading && (
        <div className="pipeline-columns" aria-busy="true" aria-label="Loading pipeline">
          {PIPELINE_COLUMNS.map((col) => (
            <div key={col.key} className={`pipeline-column pipeline-column--${col.key.toLowerCase()}`}>
              <div className="pipeline-column-head">
                <span>{col.label}</span>
                <span className="pipeline-column-count">—</span>
              </div>
              <div className="pipeline-column-body">
                <div className="pipeline-skel" />
                <div className="pipeline-skel" />
                <div className="pipeline-skel pipeline-skel--short" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && candidates.length === 0 && (
        <div className="pipeline-board-empty">No candidates in this pipeline yet.</div>
      )}

      {!loading && !error && (
        <div className="pipeline-columns">
          {PIPELINE_COLUMNS.map((col) => {
            const items = grouped[col.key] || [];
            return (
              <div key={col.key} className={`pipeline-column pipeline-column--${col.key.toLowerCase()}`}>
                <div className="pipeline-column-head">
                  <span>{col.label}</span>
                  <span className="pipeline-column-count">{items.length}</span>
                </div>
                <div className="pipeline-column-body">
                  {items.length === 0 && (
                    <div className="pipeline-empty">No candidates in this stage</div>
                  )}
                  {items.map((c) => {
                    const { pipelineStage, pipelineLabel } = derivePipelineStage(c);
                    const terminal = pipelineStage === 'JOINED' || pipelineStage === 'ONBOARDING' || pipelineStage === 'OFFER' || pipelineStage === 'SELECTED';
                    return (
                      <div
                        key={c.id || c.publicId}
                        className="pipeline-card"
                        onClick={() => onViewCandidate?.(c)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onViewCandidate?.(c);
                          }
                        }}
                      >
                        <div className="pipeline-card-name">{c.name || c.candidateName || '—'}</div>
                        <div className="pipeline-card-id">{c.publicId || '—'}</div>
                        <div className="pipeline-card-meta">{cardSubtitle(c) || pipelineLabel}</div>
                        {editable && (
                          <div className="pipeline-card-actions" onClick={(e) => e.stopPropagation()}>
                            {onEditCandidate && !recruitingBlocked && (
                              <button type="button" className="cand-edit" onClick={() => onEditCandidate(c)}>
                                Edit
                              </button>
                            )}
                            {onSelectCandidate && !recruitingBlocked && !c.selected && !c.offer && (
                              <button
                                type="button"
                                className="cand-edit"
                                onClick={() => onSelectCandidate(c, true)}
                              >
                                Select
                              </button>
                            )}
                            {onAdvanceStage && !recruitingBlocked && !terminal && (
                              <>
                                {pipelineStage !== 'CLIENT_SHORTLIST' && pipelineStage !== 'INTERVIEW' && (
                                  <button type="button" className="cand-edit" onClick={() => onAdvanceStage(c, 'shortlist')}>
                                    Shortlist
                                  </button>
                                )}
                                {pipelineStage !== 'INTERVIEW' && pipelineStage !== 'HOLD' && pipelineStage !== 'REJECT' && (
                                  <button type="button" className="cand-edit" onClick={() => onAdvanceStage(c, 'interview')}>
                                    Interview
                                  </button>
                                )}
                                {pipelineStage !== 'HOLD' && (
                                  <button type="button" className="cand-edit" onClick={() => onAdvanceStage(c, 'hold')}>
                                    Hold
                                  </button>
                                )}
                                {pipelineStage !== 'REJECT' && (
                                  <button type="button" className="cand-edit" onClick={() => onAdvanceStage(c, 'reject')}>
                                    Reject
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {requirementId && <RequirementNotes requirementId={requirementId} />}
    </div>
  );
}
