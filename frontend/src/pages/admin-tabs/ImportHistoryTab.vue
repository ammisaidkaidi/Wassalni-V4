<script setup lang="ts">
/** Task 12.5 — import history, including failed runs (previously left no trace). */
import { onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { ImportLogRow } from '../../types';

const { t } = useI18n();
const rows = ref<ImportLogRow[]>([]);
const msg = ref('');

onMounted(() => {
  api<{ imports: ImportLogRow[] }>('/api/admin/import-history')
    .then((r) => {
      rows.value = r.imports;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
});
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.importHistory.intro') }}</p>
    <p v-if="msg" class="alert error" role="alert">{{ msg }}</p>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.date') }}</th>
            <th>{{ t('admin.importHistory.result') }}</th>
            <th>{{ t('admin.importHistory.detail') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ fmtDateTime(r.ran_at) }}</td>
            <td><span :class="`chip ${r.success ? 'confirmed' : 'cancelled'}`">{{ r.success ? t('admin.importHistory.success') : t('admin.importHistory.failure') }}</span></td>
            <td class="muted small">{{ r.error_details ?? '—' }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="3" class="empty">{{ t('admin.importHistory.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
