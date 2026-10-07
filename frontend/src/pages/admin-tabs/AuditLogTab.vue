<script setup lang="ts">
/** Task 12.4 — admin action audit log viewer (who did what, when, to what). */
import { onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { AdminAuditLogRow } from '../../types';

const { t } = useI18n();
const rows = ref<AdminAuditLogRow[]>([]);
const msg = ref('');

async function load(): Promise<void> {
  try {
    rows.value = (await api<{ entries: AdminAuditLogRow[] }>('/api/admin/audit-log?limit=300')).entries;
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(load);
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.auditLog.intro') }}</p>
    <p v-if="msg" class="alert error" role="alert">{{ msg }}</p>
    <button class="btn ghost small" @click="void load()">{{ t('admin.common.refresh') }}</button>
    <div class="table-wrap" style="margin-top: 10px">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.date') }}</th>
            <th>{{ t('admin.auditLog.admin') }}</th>
            <th>{{ t('admin.auditLog.action') }}</th>
            <th>{{ t('admin.auditLog.target') }}</th>
            <th>{{ t('admin.auditLog.reason') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ fmtDateTime(r.created_at) }}</td>
            <td>{{ r.admin_name ?? '—' }}</td>
            <td>{{ r.action }}</td>
            <td class="muted small">{{ r.target_type ?? '—' }} {{ r.target_id ? `#${r.target_id.slice(0, 8)}` : '' }}</td>
            <td class="muted small">{{ r.reason ?? '—' }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="5" class="empty">{{ t('admin.auditLog.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
