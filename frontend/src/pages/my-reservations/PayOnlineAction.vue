<script setup lang="ts">
/**
 * Task 7.1/7.2 — "Payer en ligne". Opens the mock gateway's hosted checkout
 * page in a new tab (it's a plain unauthenticated page served by the
 * backend) and polls OUR server for the payment's actual status — the tab
 * itself is never trusted, only `GET /:id/payments` is, since the webhook
 * that marks a payment paid is asynchronous and server-to-server.
 */
import { computed, onUnmounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { PaymentRow } from '../../types';

const props = defineProps<{ reservationId: string }>();
const emit = defineEmits<{ settled: [] }>();

const { t } = useI18n();
const paymentMethodLabel = computed<Record<string, string>>(() => ({
  cib: t('paymentMethod.cib'),
  edahabia: t('paymentMethod.edahabia'),
  card: t('paymentMethod.card'),
  bank_transfer: t('paymentMethod.bank_transfer'),
}));
const method = ref('cib');
const busy = ref(false);
const msg = ref('');
let pollRef: ReturnType<typeof setInterval> | null = null;

onUnmounted(() => {
  if (pollRef) clearInterval(pollRef);
});

async function pay(): Promise<void> {
  busy.value = true;
  msg.value = '';
  try {
    const r = await api<{ checkout_url: string }>(`/api/reservations/${props.reservationId}/checkout`, { method: 'POST', body: { method: method.value } });
    window.open(r.checkout_url, '_blank', 'noopener');
    msg.value = t('reservations.payOnlineOpened');
    let attempts = 0;
    pollRef = setInterval(async () => {
      attempts += 1;
      try {
        const p = await api<{ payments: PaymentRow[] }>(`/api/reservations/${props.reservationId}/payments`);
        const settled = p.payments.find((pay) => pay.status === 'paid' || pay.status === 'failed');
        if (settled) {
          if (pollRef) clearInterval(pollRef);
          busy.value = false;
          msg.value =
            settled.status === 'paid'
              ? t('reservations.paymentConfirmed')
              : t('reservations.paymentFailed', { reason: settled.failure_reason ? ` — ${settled.failure_reason}` : '' });
          emit('settled');
        }
      } catch {
        // transient — keep polling until the timeout below
      }
      if (attempts >= 40 && pollRef) {
        clearInterval(pollRef);
        busy.value = false;
        msg.value = t('reservations.paymentStillPending');
      }
    }, 3000);
  } catch (err) {
    busy.value = false;
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <span style="display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap">
    <select v-model="method" :disabled="busy" :aria-label="t('reservations.payOnline')">
      <option v-for="(label, k) in paymentMethodLabel" :key="k" :value="k">{{ label }}</option>
    </select>
    <button class="btn primary small" :disabled="busy" @click="void pay()">{{ t('reservations.payOnline') }}</button>
    <span v-if="msg" class="muted small" role="status">{{ msg }}</span>
  </span>
</template>
