import { useCallback, useEffect, useState } from 'react';
import { api, fmtDateTime } from '../api';
import { useI18n } from '../i18n';
import type { PushSubscriptionRow } from '../types';

/** Converts a base64url-encoded VAPID public key into the Uint8Array shape `PushManager.subscribe` expects. */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output as BufferSource;
}

/** Best-effort, privacy-light label for a device/browser from its stored user-agent string. Every token here is a proper noun (browser/OS name), so none needs translation. */
function describeDevice(userAgent: string | null, genericLabel: string): string {
  if (!userAgent) return '—';
  const ua = userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : genericLabel;
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  return [browser, os].filter(Boolean).join(' · ');
}

/**
 * Task 16.2 — Web Push: permission flow, subscription storage, and device
 * management, all in one reusable card dropped onto each role's settings
 * screen (customer ProfilePage, driver ParametresTab). Dispatch itself is
 * entirely server-side (api/push.ts's periodic sweep) — this component only
 * manages which browsers are allowed to receive it.
 */
export default function PushNotificationsCard() {
  const { t } = useI18n();
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const [permission, setPermission] = useState<NotificationPermission>(() => (supported ? Notification.permission : 'denied'));
  const [subscribed, setSubscribed] = useState(false);
  const [devices, setDevices] = useState<PushSubscriptionRow[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const loadDevices = useCallback(async () => {
    try {
      const r = await api<{ subscriptions: PushSubscriptionRow[] }>('/api/push/subscriptions');
      setDevices(r.subscriptions);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (!supported) return;
    void loadDevices();
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => undefined);
  }, [supported, loadDevices]);

  const enable = async (): Promise<void> => {
    setBusy(true);
    setMsg('');
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setMsg(t('push.permissionDenied'));
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api<{ publicKey: string }>('/api/push/vapid-public-key');
      const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await api('/api/push/subscribe', { method: 'POST', body: { subscription: subscription.toJSON() } });
      setSubscribed(true);
      setMsg(t('push.enabled'));
      await loadDevices();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const disable = async (): Promise<void> => {
    setBusy(true);
    setMsg('');
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } });
      }
      setSubscribed(false);
      setMsg(t('push.disabled'));
      await loadDevices();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string): Promise<void> => {
    setMsg('');
    try {
      await api(`/api/push/subscriptions/${id}`, { method: 'DELETE' });
      await loadDevices();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{t('push.title')}</h2>
      <p className="muted small">{t('push.intro')}</p>
      {!supported ? (
        <p className="alert info" role="status">
          {t('push.unsupported')}
        </p>
      ) : (
        <>
          {msg && (
            <p className="alert info" role="status">
              {msg}
            </p>
          )}
          {permission === 'denied' ? (
            <p className="alert error" role="alert">
              {t('push.blockedByBrowser')}
            </p>
          ) : subscribed ? (
            <button className="btn ghost small" disabled={busy} onClick={() => void disable()}>
              {t('push.disable')}
            </button>
          ) : (
            <button className="btn primary small" disabled={busy} onClick={() => void enable()}>
              {t('push.enable')}
            </button>
          )}
          {devices.length > 0 && (
            <>
              <h3 style={{ fontSize: '0.9rem', marginBottom: 6 }}>{t('push.devicesTitle')}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {devices.map((d) => (
                  <li
                    key={d.id}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: '0.85rem' }}
                  >
                    <span>{describeDevice(d.user_agent, t('push.genericBrowser'))}</span>
                    <span className="muted small">{t('push.lastSeen', { date: fmtDateTime(d.last_seen_at) })}</span>
                    <button className="btn ghost small" onClick={() => void revoke(d.id)}>
                      {t('push.revoke')}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
