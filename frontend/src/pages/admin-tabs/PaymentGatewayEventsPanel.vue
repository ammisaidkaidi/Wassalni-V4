<script setup lang="ts">
import { ref, watch } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { PaymentGatewayEventRow } from '../../types';

const { t } = useI18n();
const events = ref<PaymentGatewayEventRow[]>([]);
const open = ref(false);
const msg = ref('');

async function load(): Promise<void> {
  try {
    events.value = (await api<{ events: PaymentGatewayEventRow[] }>('/api/admin/payment-gateway-events')).events;
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

watch(open, (v) => {
  if (v) void load();
});
</script>

<template>
  <div style="margin: 20px 0">
    <button class="btn ghost small" @click="open = !open">
      {{ open ? t('admin.payments.webhookLogHide') : t('admin.payments.webhookLogShow') }} {{ t('admin.payments.webhookLogTitle') }}
    </button>
    <div v-if="open" style="margin-top: 10px">
      <p class="muted small">{{ t('admin.payments.webhookLogIntro') }}</p>
      <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('admin.payments.receivedAt') }}</th>
              <th>{{ t('admin.payments.gateway') }}</th>
              <th>{{ t('admin.payments.event') }}</th>
              <th>{{ t('admin.payments.signature') }}</th>
              <th>{{ t('admin.payments.result') }}</th>
              <th>{{ t('admin.payments.note') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in events" :key="e.id">
              <td>{{ fmtDateTime(e.received_at) }}</td>
              <td>{{ e.gateway }}</td>
              <td>{{ e.event_type }}</td>
              <td>{{ e.signature_valid ? '✔' : t('admin.payments.signatureInvalid') }}</td>
              <td>
                <span :class="`chip ${e.processing_result === 'processed' ? 'confirmed' : e.processing_result === 'rejected' ? 'cancelled' : 'pending'}`">
                  {{ e.processing_result }}
                </span>
              </td>
              <td class="muted small">{{ e.processing_note ?? '—' }}</td>
            </tr>
            <tr v-if="events.length === 0">
              <td colspan="6" class="empty">{{ t('admin.payments.noWebhooks') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
