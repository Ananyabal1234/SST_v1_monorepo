import { useState } from 'react';
import { formatDate } from '../utils/formatDate';
import { derivePipelineStage } from '../utils/pipelineStage';

function matchLabel(matchedBy) {
  if (matchedBy === 'both') return 'Email + mobile';
  if (matchedBy === 'email') return 'Email';
  if (matchedBy === 'mobile') return 'Mobile';
  return null;
}

function alreadyOnRequirement(row, currentRequirementId, currentCandidates) {
  const email = String(row.email || '').trim().toLowerCase();
  const mobile = String(row.mobile || '').trim();
  const onCurrentList = currentCandidates.some((c) => {
    const cEmail = String(c.email || '').trim().toLowerCase();
    const cMobile = String(c.mobile || '').trim();
    return (email && cEmail === email) || (mobile && cMobile === mobile);
  });
  return (
    onCurrentList
    || row.requirementId === currentRequirementId
    || row.requirement?.id === currentRequirementId
  );
}

export default function DuplicateCandidatePanel({
  loading,
  error,
  data,
  currentRequirementId,
  currentCandidates = [],
  onClone,
}) {
  const [expanded, setExpanded] = useState(true);
  const matches = data?.matches || [];

  if (loading) {
    return (
      <div className="duplicate-panel duplicate-panel--loading">
        Checking prior records…
      </div>
    );
  }

  if (error) {
    return (
      <div className="duplicate-panel duplicate-panel--error">
        {error}
      </div>
    );
  }

  if (!matches.length) return null;

  const emailCount = data?.duplicateEmailCount ?? 0;
  const mobileCount = data?.duplicateMobileCount ?? 0;
  const matchHints = [];
  if (emailCount > 0) matchHints.push(`${emailCount} by email`);
  if (mobileCount > 0) matchHints.push(`${mobileCount} by mobile`);

  return (
    <div className="duplicate-panel" role="alert">
      <div className="duplicate-panel-head">
        <div>
          <strong className="duplicate-panel-title">
            Possible duplicate
            <em>{matches.length}</em>
          </strong>
          <p className="duplicate-panel-sub">
            Already in {matches.length === 1 ? 'another' : 'other'} pipeline
            {matchHints.length ? ` (${matchHints.join(', ')})` : ''}.
            Review before saving — you can still add a new record.
          </p>
        </div>
        <button
          type="button"
          className="duplicate-panel-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {expanded && (
        <ul className="duplicate-panel-list">
          {matches.map((row) => {
            const { pipelineStage, pipelineLabel } = derivePipelineStage(row);
            const onReq = alreadyOnRequirement(row, currentRequirementId, currentCandidates);
            const matched = matchLabel(row.matchedBy);
            const req = row.requirement || {};
            const status = row.candidateStatus || row.feedbackCode || '';
            const when = formatDate(row.profileSubmittedDate || row.createdAt, '');
            return (
              <li key={row.id} className="duplicate-card">
                <div className="duplicate-card-main">
                  <div className="duplicate-card-top">
                    <strong className="duplicate-card-name">
                      {row.name || row.publicId || 'Candidate'}
                    </strong>
                    <span
                      className={`duplicate-pipeline-badge is-${String(pipelineStage || '').toLowerCase()}`}
                    >
                      {pipelineLabel}
                      {row.interviewRound ? ` · ${row.interviewRound}` : ''}
                    </span>
                  </div>
                  <p className="duplicate-card-meta">
                    <span>{row.publicId || '—'}</span>
                    {req.publicId ? <span>{req.publicId}</span> : null}
                    {when ? <span>{when}</span> : null}
                  </p>
                  <p className="duplicate-card-role">
                    {[req.clientName, req.roleSkill].filter(Boolean).join(' · ') || 'Unknown requirement'}
                  </p>
                  <div className="duplicate-card-tags">
                    {matched && (
                      <span className="duplicate-match-chip">Matched on {matched}</span>
                    )}
                    {status ? <span className="duplicate-status-chip">{status}</span> : null}
                    {row.selected && !['Selected', 'SELECTED'].includes(status) ? (
                      <span className="duplicate-status-chip">Selected</span>
                    ) : null}
                    {row.offer?.statusCode ? (
                      <span className="duplicate-status-chip">Offer {row.offer.statusCode}</span>
                    ) : null}
                    {row.onboarding?.statusCode ? (
                      <span className="duplicate-status-chip">Onboarding {row.onboarding.statusCode}</span>
                    ) : null}
                  </div>
                </div>
                {onClone && (
                  <div className="duplicate-card-action">
                    {onReq ? (
                      <span className="duplicate-already">On this requirement</span>
                    ) : (
                      <button
                        type="button"
                        className="duplicate-add-btn"
                        onClick={() => onClone(row)}
                      >
                        Add here
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
