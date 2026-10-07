<script setup lang="ts">
/**
 * Task 11.1 — Notifications bell shown in the top bar for every logged-in
 * role (customer/driver/admin alike), since the backend inbox is shared
 * across roles. Polls the unread count every 30s; opening the panel loads
 * the recent list and marks items read as they're clicked.
 */
import { onMounted, onUnmounted, ref } from 'vue';
import { api, fmtDateTime } from '../api';
import { useI18n } from '../composables/useI18n';
import type { NotificationRow } from '../types';

const { t } = useI18n();
const open = ref(false);
const count = ref(0);
const items = ref<NotificationRow[]>([]);
const loaded = ref(false);
const rootEl = ref<HTMLDivElement | null>(null);

function refreshCount(): void {
  api<{ count: number }>('/api/notifications/unread-count')
    .then((r) => {
      count.value = r.count;
    })
    .catch(() => undefined);
}

let interval: ReturnType<typeof setInterval> | undefined;

function onClickOutside(e: MouseEvent): void {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false;
}

onMounted(() => {
  refreshCount();
  interval = setInterval(refreshCount, 30_000);
  document.addEventListener('mousedown', onClickOutside);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
  document.removeEventListener('mousedown', onClickOutside);
});

async function togglePanel(): Promise<void> {
  const next = !open.value;
  open.value = next;
  if (next) {
    const r = await api<{ notifications: NotificationRow[] }>('/api/notifications?limit=30').catch(() => ({
      notifications: [] as NotificationRow[],
    }));
    items.value = r.notifications;
    loaded.value = true;
  }
}

async function markOne(n: NotificationRow): Promise<void> {
  if (n.read_at) return;
  await api(`/api/notifications/${n.id}/read`, { method: 'POST', body: {} }).catch(() => undefined);
  items.value = items.value.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
  count.value = Math.max(0, count.value - 1);
}

async function markAll(): Promise<void> {
  await api('/api/notifications/read-all', { method: 'POST', body: {} }).catch(() => undefined);
  items.value = items.value.map((x) => ({ ...x, read_at: x.read_at ?? new Date().toISOString() }));
  count.value = 0;
}

function onItemKeydown(e: KeyboardEvent, n: NotificationRow): void {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    void markOne(n);
  }
}
</script>

<template>
  <div ref="rootEl" class="notif-bell-wrap">
    <button
      class="notif-bell"
      :title="t('notifications.title')"
      aria-haspopup="true"
      :aria-expanded="open"
      :aria-label="count > 0 ? t('notifications.unreadCount', { count }) : t('notifications.title')"
      @click="void togglePanel()"
    >
      🔔
      <span v-if="count > 0" class="notif-dot" aria-hidden="true">{{ count > 99 ? '99+' : count }}</span>
    </button>
    <div v-if="open" class="notif-panel" role="dialog" :aria-label="t('notifications.title')">
      <div class="notif-panel-head">
        <strong>{{ t('notifications.title') }}</strong>
        <button class="btn ghost small" @click="void markAll()">{{ t('notifications.markAllRead') }}</button>
      </div>
      <p v-if="!loaded" class="empty">{{ t('notifications.loading') }}</p>
      <p v-else-if="items.length === 0" class="empty">{{ t('notifications.none') }}</p>
      <div
        v-for="n in items"
        :key="n.id"
        :class="`notif-item${n.read_at ? '' : ' unread'}`"
        role="button"
        tabindex="0"
        @click="void markOne(n)"
        @keydown="onItemKeydown($event, n)"
      >
        <div>{{ n.title }}</div>
        <div v-if="n.body" style="font-weight: 400">{{ n.body }}</div>
        <span class="notif-time">{{ fmtDateTime(n.created_at) }}</span>
      </div>
    </div>
  </div>
</template>
