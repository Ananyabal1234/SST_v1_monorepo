import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get } from '../../services/apiClient';
import { ENDPOINTS } from '../../config/api';
import { IconInbox } from '../../components/Icons';
import { EmptyState, ScreenSkeleton } from '../../components/ui';

const SECTIONS = [
  { key: 'needs', title: 'Needs you' },
  { key: 'waiting', title: 'Waiting' },
  { key: 'dates', title: 'Dates' },
];

export default function MyWorkScreen() {
  const [, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    get(ENDPOINTS.WORK_MINE)
      .then((res) => {
        if (!active) return;
        setItems(Array.isArray(res?.items) ? res.items : []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.message || err?.message || 'Failed to load work');
        setItems([]);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const openItem = (item) => {
    const next = { tab: item.tab || 'work' };
    if (item.requirementId && (item.tab === 'assign' || item.tab === 'your' || item.tab === 'lead-assign')) {
      next.req = item.requirementId;
    }
    setSearchParams(next);
  };

  if (loading) return <ScreenSkeleton rows={6} />;

  return (
    <div className="my-work-screen">
      <div className="assign-head">
        <span className="assign-badge"><IconInbox /></span>
        <div>
          <h2 className="assign-title">My Work</h2>
          <p className="assign-sub">What needs you today — handoffs, stalled reqs, and upcoming dates.</p>
        </div>
        {items.length > 0 && <span className="yr-count">{items.length}</span>}
      </div>
      {error && <div className="add-error">{error}</div>}
      {!error && items.length === 0 && (
        <EmptyState
          icon={IconInbox}
          title="You are clear"
          description="Nothing is waiting on you right now."
        />
      )}
      {SECTIONS.map((section) => {
        const group = items.filter((i) => i.section === section.key);
        if (!group.length) return null;
        return (
          <section key={section.key} className="my-work-section">
            <h3 className="my-work-section-title">{section.title}</h3>
            <div className="my-work-grid">
              {group.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`my-work-card my-work-card--${item.severity || 'medium'}`}
                  onClick={() => openItem(item)}
                >
                  <span className="my-work-kind">{item.kind?.replace(/_/g, ' ')}</span>
                  <strong>{item.title}</strong>
                  <span className="my-work-sub">{item.subtitle}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
