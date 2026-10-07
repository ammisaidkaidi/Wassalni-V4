<script setup lang="ts">
/** Task 9.2 — redeem a promo code against this reservation's total; the discount is credited to the wallet. */
import { ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';

const props = defineProps<{ reservationId: string }>();
const emit = defineEmits<{ settled: [] }>();

const { t } = useI18n();
const open = ref(false);
const code = ref('');
const busy = ref(false);
const msg = ref('');

async function submit(e: Event): Promise<void> {
  e.preventDefault();
  if (!code.value.trim()) return;
  busy.value = true;
  msg.value = '';
  try {
    await api('/api/customer/promo-codes/redeem', { method: 'POST', body: { code: code.value.trim(), reservation_id: props.reservationId } });
    msg.value = t('reservations.promoApplied');
    code.value = '';
    open.value = false;
    emit('settled');
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

function onCodeInput(e: Event): void {
  code.value = (e.target as HTMLInputElement).value.toUpperCase();
}
</script>

<template>
  <span v-if="!open">
    <button class="btn ghost small" @click="open = true">{{ t('reservations.promoCode') }}</button>
    <span v-if="msg" class="muted small" role="status"> {{ msg }}</span>
  </span>
  <form v-else class="form-inline" @submit="void submit($event)">
    <span v-if="msg" class="alert error small" role="alert">{{ msg }}</span>
    <label class="sr-only" for="promo-code-input">{{ t('reservations.promoCode') }}</label>
    <input id="promo-code-input" :value="code" :placeholder="t('reservations.promoPlaceholder')" @input="onCodeInput" />
    <button class="btn primary small" :disabled="busy">{{ t('reservations.apply') }}</button>
    <button type="button" class="btn ghost small" @click="open = false">{{ t('common.cancel') }}</button>
  </form>
</template>
