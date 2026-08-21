import { useEffect, useState } from 'react';
import { get, post } from '../services/apiClient';
import { ENDPOINTS } from '../config/api';
import { formatDate } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';

export default function RequirementNotes({ requirementId }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!requirementId) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    get(`${ENDPOINTS.REQUIREMENTS}/${requirementId}/notes`)
      .then((res) => {
        if (!active) return;
        setNotes(Array.isArray(res) ? res : res?.items || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.message || err?.message || 'Failed to load notes');
        setNotes([]);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [requirementId]);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    setError(null);
    try {
      const note = await post(`${ENDPOINTS.REQUIREMENTS}/${requirementId}/notes`, { body: trimmed });
      setNotes((prev) => [...prev, note]);
      setBody('');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to post note');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="req-notes">
      <h4 className="req-notes-title">Notes</h4>
      {loading && <p className="req-notes-empty">Loading notes…</p>}
      {!loading && notes.length === 0 && (
        <p className="req-notes-empty">No notes yet. Leave a short update for Sales, TA, and TA Lead.</p>
      )}
      <ul className="req-notes-list">
        {notes.map((n) => (
          <li key={n.id} className={`req-note${n.authorUserId === user?.id || n.author?.id === user?.id ? ' is-mine' : ''}`}>
            <div className="req-note-meta">
              <strong>{n.author?.fullName || n.author?.email || 'Someone'}</strong>
              <span>{formatDate(n.createdAt)}</span>
            </div>
            <p>{n.body}</p>
          </li>
        ))}
      </ul>
      {error && <div className="add-error">{Array.isArray(error) ? error.join(', ') : error}</div>}
      <form className="req-notes-form" onSubmit={submit}>
        <textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note for the other owners…"
        />
        <button type="submit" className="cand-edit" disabled={saving || !body.trim()}>
          {saving ? 'Posting…' : 'Post note'}
        </button>
      </form>
    </div>
  );
}
