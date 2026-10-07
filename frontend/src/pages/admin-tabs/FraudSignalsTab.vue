<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { FraudSignalRow } from '../../types';

const { t } = useI18n();
const FRAUD_SIGNAL_LABEL = computed<Record<FraudSignalRow['signal_type'], string>>(() => ({
  duplicate_nin: t('admin.fraud.types.duplicate_nin'),
  duplicate_phone: t('admin.fraud.types.duplicate_phone'),
  rapid_cancel_rebook: t('admin.fraud.types.rapid_cancel_rebook'),
  repeated_no_show: t('admin.fraud.types.repeated_no_show'),
  suspicious_payment: t('admin.fraud.types.suspicious_payment'),
  account_burst: t('admin.fraud.types.account_burst'),
}));
const rows = ref<FraudSignalRow[]>([]);
const msg = ref('');

async function load(): Promise<void> {
  try {
    rows.value = (await api<{ signals: FraudSignalRow[] }>('/api/admin/fraud-signals')).signals;
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

onMounted(load);
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.fraud.intro') }}</p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <button class="btn ghost small" @click="void load()">{{ t('admin.common.refresh') }}</button>
    <div class="table-wrap" style="margin-top: 10px">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.type') }}</th>
            <th>{{ t('admin.fraud.severity') }}</th>
            <th>{{ t('admin.fraud.subject') }}</th>
            <th>{{ t('admin.fraud.detail') }}</th>
            <th>{{ t('admin.fraud.detectedAt') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(s, i) in rows" :key="i">
            <td>{{ FRAUD_SIGNAL_LABEL[s.signal_type] }}</td>
            <td><span :class="`chip ${s.severity === 'high' ? 'cancelled' : s.severity === 'medium' ? 'pending' : 'confirmed'}`">{{ s.severity }}</span></td>
            <td>{{ s.subject_label }}</td>
            <td class="muted small">{{ s.detail }}</td>
            <td>{{ fmtDateTime(s.detected_at) }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="5" class="empty">{{ t('admin.fraud.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
