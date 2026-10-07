<script setup lang="ts">
/** Task 9.3 — pay the still-open balance straight from the customer's wallet, no gateway round-trip. */
import { ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';

const props = defineProps<{ reservationId: string }>();
const emit = defineEmits<{ settled: [] }>();

const { t } = useI18n();
const busy = ref(false);
const msg = ref('');

async function pay(): Promise<void> {
  busy.value = true;
  msg.value = '';
  try {
    await api(`/api/reservations/${props.reservationId}/pay-wallet`, { method: 'POST', body: {} });
    msg.value = t('reservations.paidWithWallet');
    emit('settled');
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <span style="display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap">
    <button class="btn ghost small" :disabled="busy" @click="void pay()">{{ t('reservations.payWithWallet') }}</button>
    <span v-if="msg" class="muted small" role="status">{{ msg }}</span>
  </span>
</template>
