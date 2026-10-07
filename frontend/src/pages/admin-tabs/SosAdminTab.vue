<script setup lang="ts">
/** Task 11.5 — SOS alerts console. */
import { onMounted, ref, watch } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { SosEventRow } from '../../types';

const { t } = useI18n();
const rows = ref<SosEventRow[]>([]);
const filter = ref<'open' | 'acknowledged' | 'resolved' | ''>('open');
const msg = ref('');

function load(): void {
  api<{ events: SosEventRow[] }>(`/api/admin/sos${filter.value ? `?status=${filter.value}` : ''}`)
    .then((r) => {
      rows.value = r.events;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
}

onMounted(load);
watch(filter, load);

async function resolve(id: string): Promise<void> {
  const notes = window.prompt(t('admin.sos.resolvePrompt'), '') ?? undefined;
  try {
    await api(`/api/admin/sos/${id}/resolve`, { method: 'POST', body: { notes } });
    load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <div>
    <div class="form-inline" style="margin-bottom: 10px">
      <label for="sos-filter">
        {{ t('admin.common.filter') }}
        <select id="sos-filter" v-model="filter">
          <option value="open">{{ t('admin.sos.filterOpen') }}</option>
          <option value="acknowledged">{{ t('admin.sos.filterAcknowledged') }}</option>
          <option value="resolved">{{ t('admin.sos.filterResolved') }}</option>
          <option value="">{{ t('admin.common.all') }}</option>
        </select>
      </label>
    </div>
    <p v-if="msg" class="alert error" role="alert">{{ msg }}</p>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.date') }}</th>
            <th>{{ t('admin.sos.role') }}</th>
            <th>{{ t('admin.sos.position') }}</th>
            <th>{{ t('admin.sos.notes') }}</th>
            <th>{{ t('admin.common.status') }}</th>
            <th>{{ t('admin.common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in rows" :key="s.id">
            <td>{{ fmtDateTime(s.created_at) }}</td>
            <td>{{ s.role }}</td>
            <td>{{ s.lat != null && s.lon != null ? `${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}` : '—' }}</td>
            <td class="muted small">{{ s.notes ?? '—' }}</td>
            <td><span :class="`chip ${s.status === 'resolved' ? 'confirmed' : 'pending'}`">{{ s.status }}</span></td>
            <td>
              <button v-if="s.status !== 'resolved'" class="btn danger small" @click="void resolve(s.id)">{{ t('admin.sos.markResolved') }}</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="6" class="empty">{{ t('admin.sos.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
