<script setup lang="ts">
import { ref, watch } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { NoShowEventRow } from '../../types';

const { t } = useI18n();
const events = ref<NoShowEventRow[]>([]);
const kindFilter = ref<'' | 'customer' | 'driver'>('');
const threshold = ref<number | null>(null);
const thresholdInput = ref('');
const msg = ref('');

async function load(kind: '' | 'customer' | 'driver'): Promise<void> {
  try {
    const qs = kind ? `?kind=${kind}` : '';
    const [e, th] = await Promise.all([
      api<{ events: NoShowEventRow[] }>(`/api/admin/no-show-events${qs}`),
      api<{ value: number }>('/api/admin/settings/no-show-threshold'),
    ]);
    events.value = e.events;
    threshold.value = th.value;
    thresholdInput.value = String(th.value);
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

watch(kindFilter, (k) => void load(k), { immediate: true });

async function saveThreshold(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api('/api/admin/settings/no-show-threshold', { method: 'PUT', body: { value: Number(thresholdInput.value) } });
    msg.value = t('admin.noShow.thresholdUpdated');
    await load(kindFilter.value);
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.noShow.intro') }}</p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <form class="card form-grid" style="max-width: 320px" @submit="void saveThreshold($event)">
      <label for="admin-noshow-threshold">
        {{ t('admin.noShow.thresholdLabel') }}
        <input v-if="threshold !== null" id="admin-noshow-threshold" v-model="thresholdInput" type="number" min="1" required />
      </label>
      <button class="btn primary">{{ t('admin.noShow.saveThreshold') }}</button>
    </form>

    <div style="margin: 12px 0">
      <select v-model="kindFilter" :aria-label="t('admin.common.filter')">
        <option value="">{{ t('admin.common.all') }}</option>
        <option value="customer">{{ t('admin.noShow.customersOpt') }}</option>
        <option value="driver">{{ t('admin.noShow.driversOpt') }}</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.date') }}</th>
            <th>{{ t('admin.common.type') }}</th>
            <th>{{ t('admin.noShow.person') }}</th>
            <th>{{ t('admin.noShow.trip') }}</th>
            <th>{{ t('admin.noShow.note') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="ev in events" :key="ev.id">
            <td>{{ fmtDateTime(ev.recorded_at) }}</td>
            <td>{{ ev.kind === 'customer' ? t('admin.noShow.customer') : t('admin.noShow.driver') }}</td>
            <td>{{ ev.kind === 'customer' ? ev.customer_name : ev.driver_name }}</td>
            <td>{{ ev.trip_code ?? '—' }}</td>
            <td>{{ ev.notes ?? '—' }}</td>
          </tr>
          <tr v-if="events.length === 0">
            <td colspan="5" class="empty">{{ t('admin.noShow.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
