<script setup lang="ts">
/**
 * Task 16.2 — Web Push: permission flow, subscription storage, and device
 * management, all in one reusable card dropped onto each role's settings
 * screen (customer ProfilePage, driver ParametresTab). Dispatch itself is
 * entirely server-side (api/push.ts's periodic sweep) — this component only
 * manages which browsers are allowed to receive it.
 */
import { onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../api';
import { useI18n } from '../composables/useI18n';
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

const { t } = useI18n();
const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const permission = ref<NotificationPermission>(supported ? Notification.permission : 'denied');
const subscribed = ref(false);
const devices = ref<PushSubscriptionRow[]>([]);
const msg = ref('');
const busy = ref(false);

async function loadDevices(): Promise<void> {
  try {
    const r = await api<{ subscriptions: PushSubscriptionRow[] }>('/api/push/subscriptions');
    devices.value = r.subscriptions;
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(() => {
  if (!supported) return;
  void loadDevices();
  navigator.serviceWorker.ready
    .then((reg) => reg.pushManager.getSubscription())
    .then((sub) => {
      subscribed.value = !!sub;
    })
    .catch(() => undefined);
});

async function enable(): Promise<void> {
  busy.value = true;
  msg.value = '';
  try {
    const perm = await Notification.requestPermission();
    permission.value = perm;
    if (perm !== 'granted') {
      msg.value = t('push.permissionDenied');
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const { publicKey } = await api<{ publicKey: string }>('/api/push/vapid-public-key');
    const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    await api('/api/push/subscribe', { method: 'POST', body: { subscription: subscription.toJSON() } });
    subscribed.value = true;
    msg.value = t('push.enabled');
    await loadDevices();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

async function disable(): Promise<void> {
  busy.value = true;
  msg.value = '';
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } });
    }
    subscribed.value = false;
    msg.value = t('push.disabled');
    await loadDevices();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

async function revoke(id: string): Promise<void> {
  msg.value = '';
  try {
    await api(`/api/push/subscriptions/${id}`, { method: 'DELETE' });
    await loadDevices();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <div class="card">
    <h2 style="margin-top: 0">{{ t('push.title') }}</h2>
    <p class="muted small">{{ t('push.intro') }}</p>
    <p v-if="!supported" class="alert info" role="status">{{ t('push.unsupported') }}</p>
    <template v-else>
      <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
      <p v-if="permission === 'denied'" class="alert error" role="alert">{{ t('push.blockedByBrowser') }}</p>
      <button v-else-if="subscribed" class="btn ghost small" :disabled="busy" @click="void disable()">
        {{ t('push.disable') }}
      </button>
      <button v-else class="btn primary small" :disabled="busy" @click="void enable()">
        {{ t('push.enable') }}
      </button>
      <template v-if="devices.length > 0">
        <h3 style="font-size: 0.9rem; margin-bottom: 6px">{{ t('push.devicesTitle') }}</h3>
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px">
          <li
            v-for="d in devices"
            :key="d.id"
            style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 0.85rem"
          >
            <span>{{ describeDevice(d.user_agent, t('push.genericBrowser')) }}</span>
            <span class="muted small">{{ t('push.lastSeen', { date: fmtDateTime(d.last_seen_at) }) }}</span>
            <button class="btn ghost small" @click="void revoke(d.id)">{{ t('push.revoke') }}</button>
          </li>
        </ul>
      </template>
    </template>
  </div>
</template>
