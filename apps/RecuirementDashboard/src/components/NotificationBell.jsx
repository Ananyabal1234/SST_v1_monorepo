import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get, patch, post } from '../services/apiClient';
import { ENDPOINTS } from '../config/api';
import { IconBell } from './Icons';
import { formatDate } from '../utils/formatDate';
import { useToast } from '../context/ToastContext';

const POLL_MS = 20_000;
const TOAST_CAP = 3;
const BODY_MAX = 80;

function linkParams(n) {
  const tab = n.linkTab || 'work';
  const next = { tab };
  if (
    n.entityId &&
    (tab === 'assign' || tab === 'your' || tab === 'lead-assign')
  ) {
    next.req = n.entityId;
  }
  return next;
}

function toastMessage(n) {
  const title = String(n?.title || '').trim();
  const body = String(n?.body || '').trim();
  if (!title) return body;
  if (!body || body.length > BODY_MAX) return title;
  return `${title} — ${body}`;
}

export default function NotificationBell() {
  const [, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapRef = useRef(null);
  const seenIdsRef = useRef(null);

  const load = useCallback(() => {
    const skipToast = seenIdsRef.current === null;
    get(ENDPOINTS.NOTIFICATIONS)
      .then((res) => {
        const next = Array.isArray(res?.items) ? res.items : [];
        const ids = next.map((n) => n.id).filter(Boolean);
        if (skipToast) {
          const seen = seenIdsRef.current || new Set();
          ids.forEach((id) => seen.add(id));
          seenIdsRef.current = seen;
        } else {
          const seen = seenIdsRef.current || new Set();
          const fresh = next.filter((n) => n?.id && !seen.has(n.id) && !n.readAt);
          fresh.slice(0, TOAST_CAP).forEach((n) => toast(toastMessage(n), 'info'));
          ids.forEach((id) => seen.add(id));
          seenIdsRef.current = seen;
        }
        setItems(next);
        setUnreadCount(Number(res?.unreadCount) || 0);
      })
      .catch(() => {
        setItems([]);
        setUnreadCount(0);
      });
  }, [toast]);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.readAt) {
      try {
        const res = await patch(`${ENDPOINTS.NOTIFICATIONS}/${n.id}/read`);
        setItems(Array.isArray(res?.items) ? res.items : items);
        setUnreadCount(Number(res?.unreadCount) || 0);
      } catch {
        /* still navigate */
      }
    }
    setSearchParams(linkParams(n));
  };

  const markAll = async () => {
    try {
      const res = await post(`${ENDPOINTS.NOTIFICATIONS}/read-all`);
      setItems(Array.isArray(res?.items) ? res.items : []);
      setUnreadCount(Number(res?.unreadCount) || 0);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="notif-bell" ref={wrapRef}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <IconBell />
        {unreadCount > 0 && (
          <span className="notif-bell-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="notif-dropdown" role="menu">
          <div className="notif-dropdown-head">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" className="filter-clear" onClick={markAll}>
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="notif-empty">No notifications yet.</p>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notif-item${n.readAt ? '' : ' is-unread'}`}
                    onClick={() => openItem(n)}
                  >
                    <strong>{n.title}</strong>
                    {n.body && <span>{n.body}</span>}
                    <em>{formatDate(n.createdAt)}</em>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
