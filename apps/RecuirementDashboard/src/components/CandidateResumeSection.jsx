import { useEffect, useState } from 'react';
import { get, downloadResume } from '../services/apiClient';
import { ENDPOINTS } from '../config/api';

/**
 * Shows attached resume metadata and a download action in candidate profile modals.
 * Fetches fresh detail from the API so pipeline/local snapshots stay in sync.
 */
export default function CandidateResumeSection({
  candidateId,
  initialHasResume = false,
  initialFileName = '',
  className = 'detail-field full',
}) {
  const [meta, setMeta] = useState({
    hasResume: Boolean(initialHasResume || initialFileName),
    resumeFileName: initialFileName || '',
  });
  const [loading, setLoading] = useState(Boolean(candidateId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!candidateId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    get(`${ENDPOINTS.CANDIDATES}/${candidateId}`)
      .then((detail) => {
        if (!active) return;
        setMeta({
          hasResume: Boolean(detail?.hasResume),
          resumeFileName: detail?.resumeFileName || '',
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Failed to load resume info');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [candidateId]);

  const handleDownload = async () => {
    if (!candidateId) return;
    try {
      setError(null);
      await downloadResume(candidateId, meta.resumeFileName || 'resume');
    } catch (err) {
      setError(err?.message || 'Failed to download resume');
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <span className="detail-label">Resume</span>
        <span className="detail-value">Loading…</span>
      </div>
    );
  }

  if (!meta.hasResume) {
    return null;
  }

  return (
    <div className={className}>
      <span className="detail-label">Resume</span>
      <div className="resume-download-row">
        <span>{meta.resumeFileName || 'Resume file'}</span>
        <button type="button" className="filter-clear" onClick={handleDownload}>
          Download Resume
        </button>
      </div>
      {error && <div className="add-error mt-sm">{error}</div>}
    </div>
  );
}
