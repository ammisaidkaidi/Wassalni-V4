<script setup lang="ts">
/** Task 10.2 — admin-side waitlist overview, keyed by trip id typed in manually (no trip picker here — reached from the Trips tab normally). */
import { ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { WaitlistEntryRow } from '../../types';

const { t } = useI18n();
const tripId = ref('');
const entries = ref<WaitlistEntryRow[]>([]);
const msg = ref('');

async function load(): Promise<void> {
  if (!tripId.value.trim()) return;
  msg.value = '';
  try {
    const r = await api<{ entries: WaitlistEntryRow[] }>(`/api/admin/trips/${tripId.value.trim()}/waitlist`);
    entries.value = r.entries;
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

async function promote(): Promise<void> {
  if (!tripId.value.trim()) return;
  msg.value = '';
  try {
    const r = await api<{ promoted: number }>(`/api/admin/trips/${tripId.value.trim()}/waitlist/promote`, { method: 'POST', body: {} });
    msg.value = t('admin.waitlist.promoted', { count: r.promoted });
    await load();
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.waitlist.intro') }}</p>
    <div class="form-inline">
      <label for="waitlist-trip-id">
        {{ t('admin.waitlist.tripIdLabel') }}
        <input id="waitlist-trip-id" v-model="tripId" :placeholder="t('admin.waitlist.tripIdPlaceholder')" />
      </label>
      <button class="btn ghost small" @click="void load()">{{ t('admin.waitlist.load') }}</button>
      <button class="btn primary small" @click="void promote()">{{ t('admin.waitlist.promoteNow') }}</button>
    </div>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <div class="table-wrap" style="margin-top: 10px">
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t('admin.reservations.customer') }}</th>
            <th>{{ t('admin.common.seats') }}</th>
            <th>{{ t('admin.common.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in entries" :key="e.id">
            <td>{{ e.position }}</td>
            <td>{{ e.customer_name ?? '—' }}</td>
            <td>{{ e.seats }}</td>
            <td>{{ e.status }}</td>
          </tr>
          <tr v-if="entries.length === 0">
            <td colspan="4" class="empty">{{ t('admin.waitlist.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
