import { useCallback, useEffect, useRef, useState } from 'react';
import { api, fmtDateTime } from '../api';
import type { NotificationRow } from '../types';

/**
 * Task 11.1 — Notifications bell shown in the top bar for every logged-in
 * role (customer/driver/admin alike), since the backend inbox is shared
 * across roles. Polls the unread count every 30s; opening the panel loads
 * the recent list and marks items read as they're clicked.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    api<{ count: number }>('/api/notifications/unread-count')
      .then((r) => setCount(r.count))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 30_000);
    return () => clearInterval(t);
  }, [refreshCount]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const togglePanel = async (): Promise<void> => {
    const next = !open;
    setOpen(next);
    if (next) {
      const r = await api<{ notifications: NotificationRow[] }>('/api/notifications?limit=30').catch(() => ({ notifications: [] }));
      setItems(r.notifications);
      setLoaded(true);
    }
  };

  const markOne = async (n: NotificationRow): Promise<void> => {
    if (n.read_at) return;
    await api(`/api/notifications/${n.id}/read`, { method: 'POST', body: {} }).catch(() => undefined);
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    setCount((c) => Math.max(0, c - 1));
  };

  const markAll = async (): Promise<void> => {
    await api('/api/notifications/read-all', { method: 'POST', body: {} }).catch(() => undefined);
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    setCount(0);
  };

  return (
    <div className="notif-bell-wrap" ref={ref}>
      <button className="notif-bell" onClick={() => void togglePanel()} title="Notifications">
        🔔
        {count > 0 && <span className="notif-dot">{count > 99 ? '99+' : count}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel-head">
            <strong>Notifications</strong>
            <button className="btn ghost small" onClick={() => void markAll()}>
              Tout marquer lu
            </button>
          </div>
          {!loaded && <p className="empty">Chargement…</p>}
          {loaded && items.length === 0 && <p className="empty">Aucune notification.</p>}
          {items.map((n) => (
            <div key={n.id} className={`notif-item${n.read_at ? '' : ' unread'}`} onClick={() => void markOne(n)}>
              <div>{n.title}</div>
              {n.body && <div style={{ fontWeight: 400 }}>{n.body}</div>}
              <span className="notif-time">{fmtDateTime(n.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
