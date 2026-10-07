<script setup lang="ts">
/** Task 10.2 — waitlist entries the customer currently holds. */
import { onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { WaitlistEntryRow } from '../../types';

const { t } = useI18n();
const entries = ref<WaitlistEntryRow[]>([]);
const msg = ref('');

function load(): void {
  api<{ entries: WaitlistEntryRow[] }>('/api/customer/waitlist')
    .then((r) => {
      entries.value = r.entries;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
}
onMounted(load);

async function cancel(id: string): Promise<void> {
  await api(`/api/customer/waitlist/${id}/cancel`, { method: 'POST', body: {} }).catch(() => undefined);
  load();
}

function statusLabel(key: string): string {
  const translated = t(`status.waitlist.${key}`);
  return translated === `status.waitlist.${key}` ? key : translated;
}
</script>

<template>
  <div class="card">
    <h2 style="margin-top: 0">{{ t('customerExtras.waitlistTitle') }}</h2>
    <p v-if="msg" style="color: var(--danger)" role="alert">{{ msg }}</p>
    <p v-if="entries.length === 0" class="empty">{{ t('customerExtras.notOnWaitlist') }}</p>
    <div
      v-for="e in entries"
      :key="e.id"
      class="meta"
      style="flex-direction: row; justify-content: space-between; align-items: center"
    >
      <span>
        <router-link v-if="e.trip_code" :to="`/trips/${e.trip_id}`">{{ e.trip_code }}</router-link>
        <template v-else>{{ t('customerExtras.trip') }}</template>
        {{ t('customerExtras.waitlistLine', { seats: e.seats, position: e.position }) }}
        <span class="pill">{{ statusLabel(e.status) }}</span>
        {{ e.departure_at ? ` — ${fmtDateTime(e.departure_at)}` : '' }}
      </span>
      <button v-if="e.status === 'waiting' || e.status === 'offered'" class="btn ghost small" @click="void cancel(e.id)">
        {{ t('customerExtras.cancel') }}
      </button>
    </div>
  </div>
</template>
