import { useEffect, useMemo, useState } from 'react';
import { get, post } from '../services/apiClient';
import { ENDPOINTS } from '../config/api';
import { buildBooleanQuery, buildSearchUrls } from '../utils/booleanSearch';
import { formatDate } from '../utils/formatDate';

const EMPTY_PASTE = { name: '', email: '', mobile: '', source: '', remarks: '' };

export default function SourcingPanel({
  requirement,
  recruitingBlocked,
  currentCandidates = [],
  onClone,
  onImported,
}) {
  const [section, setSection] = useState('search');
  const initialBoolean = useMemo(
    () =>
      buildBooleanQuery({
        roleSkill: requirement?.position || requirement?.roleSkill,
        experience: requirement?.experience,
        jobLocation: requirement?.jobLocation,
        remarks: requirement?.remarks,
      }),
    [
      requirement?.position,
      requirement?.roleSkill,
      requirement?.experience,
      requirement?.jobLocation,
      requirement?.remarks,
    ],
  );
  const [booleanQuery, setBooleanQuery] = useState(initialBoolean);
  const [copyState, setCopyState] = useState('');

  const [talentQ, setTalentQ] = useState(requirement?.position || '');
  const [talentItems, setTalentItems] = useState([]);
  const [talentLoading, setTalentLoading] = useState(false);
  const [talentError, setTalentError] = useState(null);

  const [paste, setPaste] = useState(EMPTY_PASTE);
  const [pasteBusy, setPasteBusy] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  useEffect(() => {
    setBooleanQuery(initialBoolean);
  }, [initialBoolean]);

  useEffect(() => {
    setTalentQ(requirement?.position || '');
  }, [requirement?.id, requirement?.position]);

  useEffect(() => {
    if (section !== 'talent' || !requirement?.id) return undefined;
    let active = true;
    setTalentLoading(true);
    setTalentError(null);
    const params = new URLSearchParams({ requirementId: requirement.id });
    const q = (requirement?.position || '').trim();
    if (q) params.set('q', q);
    get(`${ENDPOINTS.TALENT_POOL}?${params.toString()}`)
      .then((res) => {
        if (!active) return;
        setTalentItems(Array.isArray(res?.items) ? res.items : []);
      })
      .catch((err) => {
        if (!active) return;
        setTalentError(err?.response?.data?.message || err?.message || 'Failed to search talent pool');
        setTalentItems([]);
      })
      .finally(() => active && setTalentLoading(false));
    return () => { active = false; };
  }, [section, requirement?.id, requirement?.position]);

  const urls = useMemo(
    () =>
      buildSearchUrls({
        booleanQuery,
        roleSkill: requirement?.position || requirement?.roleSkill,
        jobLocation: requirement?.jobLocation,
      }),
    [booleanQuery, requirement?.position, requirement?.roleSkill, requirement?.jobLocation],
  );

  const alreadyOnReq = (email, mobile) => {
    const e = String(email || '').trim().toLowerCase();
    const m = String(mobile || '').trim();
    return currentCandidates.some((c) => {
      const cEmail = String(c.email || '').trim().toLowerCase();
      const cMobile = String(c.mobile || '').trim();
      return (e && cEmail === e) || (m && cMobile === m);
    });
  };

  const copyBoolean = async () => {
    try {
      await navigator.clipboard.writeText(booleanQuery);
      setCopyState('Copied');
    } catch {
      setCopyState('Copy failed');
    }
    setTimeout(() => setCopyState(''), 1600);
  };

  const loadTalent = async (e) => {
    e?.preventDefault?.();
    if (!requirement?.id) return;
    setTalentLoading(true);
    setTalentError(null);
    try {
      const params = new URLSearchParams({ requirementId: requirement.id });
      if (talentQ.trim()) params.set('q', talentQ.trim());
      const res = await get(`${ENDPOINTS.TALENT_POOL}?${params.toString()}`);
      setTalentItems(Array.isArray(res?.items) ? res.items : []);
    } catch (err) {
      setTalentError(err?.response?.data?.message || err?.message || 'Failed to search talent pool');
      setTalentItems([]);
    } finally {
      setTalentLoading(false);
    }
  };

  const submitPaste = async (e) => {
    e.preventDefault();
    if (recruitingBlocked || pasteBusy) return;
    setPasteBusy(true);
    setImportError(null);
    try {
      await onImported?.({
        name: paste.name,
        email: paste.email,
        mobile: paste.mobile,
        source: paste.source || 'Paste',
        remarks: paste.remarks || undefined,
      });
      setPaste(EMPTY_PASTE);
    } catch (err) {
      setImportError(err?.response?.data?.message || err?.message || 'Failed to add candidate');
    } finally {
      setPasteBusy(false);
    }
  };

  const submitCsv = async (e) => {
    e.preventDefault();
    if (recruitingBlocked || importBusy || !requirement?.id) return;
    setImportBusy(true);
    setImportError(null);
    setImportResult(null);
    try {
      const res = await post(ENDPOINTS.IMPORT_CANDIDATES, {
        requirementId: requirement.id,
        csv: csvText,
      });
      setImportResult(res);
      const created = Array.isArray(res?.created) ? res.created : [];
      if (created.length) onImported?.(created, { bulk: true });
    } catch (err) {
      setImportError(err?.response?.data?.message || err?.message || 'Import failed');
    } finally {
      setImportBusy(false);
    }
  };

  const onFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
  };

  return (
    <div className="sourcing-panel">
      <div className="at-view-toggle sourcing-tabs" role="tablist" aria-label="Sourcing mode">
        {[
          { key: 'search', label: 'Search' },
          { key: 'talent', label: 'Talent pool' },
          { key: 'import', label: 'Import' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            className={section === tab.key ? 'active' : ''}
            aria-selected={section === tab.key}
            onClick={() => setSection(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === 'search' && (
        <div className="sourcing-section">
          <div className="field">
            <label className="field-label" htmlFor="sourcing-boolean">Boolean query</label>
            <textarea
              id="sourcing-boolean"
              className="field-control"
              rows={3}
              value={booleanQuery}
              onChange={(e) => setBooleanQuery(e.target.value)}
            />
          </div>
          <div className="sourcing-actions">
            <button type="button" className="cand-edit" onClick={copyBoolean}>
              {copyState || 'Copy Boolean'}
            </button>
            <a className="cand-edit" href={urls.linkedin} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a className="cand-edit" href={urls.naukri} target="_blank" rel="noreferrer">
              Naukri
            </a>
            <a className="cand-edit" href={urls.indeed} target="_blank" rel="noreferrer">
              Indeed
            </a>
            <a className="cand-edit" href={urls.google} target="_blank" rel="noreferrer">
              Google
            </a>
          </div>
          <p className="sourcing-hint">
            Opens in a new tab with your own login. SST does not fetch those databases.
          </p>
        </div>
      )}

      {section === 'talent' && (
        <div className="sourcing-section">
          <form className="sourcing-talent-form" onSubmit={loadTalent}>
            <div className="field">
              <label className="field-label" htmlFor="sourcing-talent-q">Role keywords</label>
              <input
                id="sourcing-talent-q"
                className="field-control"
                type="search"
                value={talentQ}
                onChange={(e) => setTalentQ(e.target.value)}
                placeholder="Role keywords…"
              />
            </div>
            <button type="submit" className="add-submit" disabled={talentLoading}>
              {talentLoading ? 'Searching…' : 'Search pool'}
            </button>
          </form>
          {talentError && <div className="add-error">{talentError}</div>}
          {!talentLoading && talentItems.length === 0 && (
            <div className="kpi-modal-empty">No similar candidates yet. Search to scan past requirements.</div>
          )}
          {talentItems.length > 0 && (
            <ul className="sourcing-talent-list">
              {talentItems.map((row) => {
                const onReq = alreadyOnReq(row.email, row.mobile);
                return (
                  <li key={row.id}>
                    <div className="sourcing-talent-main">
                      <strong>{row.name}</strong>
                      <span className="sourcing-talent-meta">
                        {row.publicId}
                        {' · '}
                        {row.requirement?.publicId || '—'}
                        {' · '}
                        {row.requirement?.clientName || '—'}
                      </span>
                      <span className="sourcing-talent-tags">
                        <span className="duplicate-pipeline-badge">
                          {row.pipelineLabel || row.stageCode || '—'}
                        </span>
                        {row.selected ? <span className="duplicate-already">Selected</span> : null}
                        <em>{formatDate(row.createdAt)}</em>
                      </span>
                    </div>
                    {onReq ? (
                      <span className="duplicate-already">Already on this req</span>
                    ) : (
                      <button
                        type="button"
                        className="cand-edit"
                        disabled={recruitingBlocked}
                        onClick={() => onClone?.(row)}
                      >
                        Add to this requirement
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {section === 'import' && (
        <div className="sourcing-section">
          {recruitingBlocked && (
            <p className="sourcing-hint">Recruiting is paused on this requirement.</p>
          )}
          <form className="sourcing-paste-form" onSubmit={submitPaste}>
            <fieldset className="cand-form-section">
              <legend>Paste one person</legend>
              <div className="sourcing-paste-grid">
                <div className="field">
                  <label className="field-label" htmlFor="sourcing-paste-name">Name</label>
                  <input
                    id="sourcing-paste-name"
                    className="field-control"
                    required
                    value={paste.name}
                    disabled={recruitingBlocked}
                    onChange={(e) => setPaste((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="sourcing-paste-email">Email</label>
                  <input
                    id="sourcing-paste-email"
                    className="field-control"
                    required
                    type="email"
                    value={paste.email}
                    disabled={recruitingBlocked}
                    onChange={(e) => setPaste((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="sourcing-paste-mobile">Mobile</label>
                  <input
                    id="sourcing-paste-mobile"
                    className="field-control"
                    required
                    value={paste.mobile}
                    disabled={recruitingBlocked}
                    onChange={(e) => setPaste((p) => ({ ...p, mobile: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="sourcing-paste-source">Source</label>
                  <input
                    id="sourcing-paste-source"
                    className="field-control"
                    placeholder="LinkedIn / Naukri"
                    value={paste.source}
                    disabled={recruitingBlocked}
                    onChange={(e) => setPaste((p) => ({ ...p, source: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="sourcing-paste-url">Profile URL</label>
                  <input
                    id="sourcing-paste-url"
                    className="field-control"
                    placeholder="Optional"
                    value={paste.remarks}
                    disabled={recruitingBlocked}
                    onChange={(e) => setPaste((p) => ({ ...p, remarks: e.target.value }))}
                  />
                </div>
              </div>
              <button type="submit" className="add-submit" disabled={recruitingBlocked || pasteBusy}>
                {pasteBusy ? 'Adding…' : 'Add candidate'}
              </button>
            </fieldset>
          </form>

          <form className="sourcing-csv-form" onSubmit={submitCsv}>
            <fieldset className="cand-form-section">
              <legend>CSV import</legend>
              <p className="sourcing-hint">Header required: name,email,mobile. Optional: source,remarks. Max 50 rows.</p>
              <div className="field">
                <label className="field-label" htmlFor="sourcing-csv-file">CSV file</label>
                <input
                  id="sourcing-csv-file"
                  className="field-control"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={recruitingBlocked}
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="sourcing-csv-text">Or paste CSV</label>
                <textarea
                  id="sourcing-csv-text"
                  className="field-control"
                  rows={4}
                  placeholder={'name,email,mobile,source,remarks\nJane Doe,jane@example.com,9876543210,LinkedIn,'}
                  value={csvText}
                  disabled={recruitingBlocked}
                  onChange={(e) => setCsvText(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="add-submit"
                disabled={recruitingBlocked || importBusy || !csvText.trim()}
              >
                {importBusy ? 'Importing…' : 'Import CSV'}
              </button>
            </fieldset>
          </form>
          {importError && <div className="add-error">{Array.isArray(importError) ? importError.join(', ') : importError}</div>}
          {importResult && (
            <p className="sourcing-hint">
              Created {importResult.created?.length || 0}
              {', '}
              skipped {importResult.skipped?.length || 0}
              {', '}
              errors {importResult.errors?.length || 0}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
