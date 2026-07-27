import { useState } from 'react';

function fmtDate(value) {
  if (!value) return '—';
  return String(value).slice(0, 10);
}

export default function DuplicateCandidatePanel({ loading, error, data }) {
  const [expanded, setExpanded] = useState(true);
  const matches = data?.matches || [];

  if (loading) {
    return (
      <div className="duplicate-panel duplicate-panel--loading">
        Checking for prior candidate records…
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
            Possible duplicate — {matches.length} prior record{matches.length === 1 ? '' : 's'}
          </strong>
          <p className="duplicate-panel-sub">
            This person appears in other requirement pipelines ({matchHints.join(', ')}).
            You can still save; review history before proceeding.
          </p>
        </div>
        <button
          type="button"
          className="duplicate-panel-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Hide history' : 'Show history'}
        </button>
      </div>

      {expanded && (
        <div className="duplicate-panel-table-wrap">
          <table className="duplicate-panel-table">
            <thead>
              <tr>
                <th>Candidate ID</th>
                <th>Requirement</th>
                <th>Client</th>
                <th>Role</th>
                <th>Pipeline</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Round</th>
                <th>Selected</th>
                <th>Offer</th>
                <th>Onboarding</th>
                <th>Remarks</th>
                <th>Submitted</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((row) => (
                <tr key={row.id}>
                  <td>{row.publicId || row.id}</td>
                  <td>{row.requirement?.publicId || '—'}</td>
                  <td>{row.requirement?.clientName || '—'}</td>
                  <td>{row.requirement?.roleSkill || '—'}</td>
                  <td>
                    <span className="duplicate-pipeline-badge">
                      {row.pipelineLabel || row.pipelineStage || '—'}
                    </span>
                  </td>
                  <td>{row.stageCode || '—'}</td>
                  <td>{row.candidateStatus || row.feedbackCode || '—'}</td>
                  <td>{row.interviewRound || '—'}</td>
                  <td>{row.selected ? 'Yes' : 'No'}</td>
                  <td>{row.offer?.statusCode || '—'}</td>
                  <td>{row.onboarding?.statusCode || '—'}</td>
                  <td className="duplicate-remarks">{row.remarks || '—'}</td>
                  <td>{fmtDate(row.profileSubmittedDate)}</td>
                  <td>{fmtDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
