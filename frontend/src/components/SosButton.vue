<script setup lang="ts">
/**
 * Task 11.5 — SOS trigger, usable from either the customer or driver side
 * (both roles have an identical POST /api/{role}/sos endpoint). Optionally
 * scoped to one reservation ongoing right now.
 */
import { ref } from 'vue';
import { api } from '../api';
import { useI18n } from '../composables/useI18n';

const props = defineProps<{ role: 'customer' | 'driver'; reservationId?: string }>();

const { t } = useI18n();
const open = ref(false);
const notes = ref('');
const sending = ref(false);
const sent = ref(false);
const error = ref('');

async function trigger(): Promise<void> {
  sending.value = true;
  error.value = '';
  try {
    let coords: { lat?: number; lon?: number } = {};
    if ('geolocation' in navigator) {
      coords = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
          () => resolve({}),
          { timeout: 3000 },
        );
      });
    }
    await api(`/api/${props.role}/sos`, {
      method: 'POST',
      body: {
        reservation_id: props.reservationId ?? null,
        lat: coords.lat ?? null,
        lon: coords.lon ?? null,
        notes: notes.value.trim() || null,
      },
    });
    sent.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <button v-if="!open" class="sos-btn" @click="open = true">{{ t('sos.button') }}</button>
  <div v-else class="mini-card" style="border-color: var(--danger)">
    <template v-if="sent">
      <p><strong>{{ t('sos.sentTitle') }}</strong> {{ t('sos.sentBody') }}</p>
      <button class="btn ghost small" @click="open = false">{{ t('sos.close') }}</button>
    </template>
    <template v-else>
      <p><strong>{{ t('sos.confirmTitle') }}</strong> {{ t('sos.confirmBody') }}</p>
      <label for="sos-message">
        {{ t('sos.messageLabel') }}
        <input id="sos-message" v-model="notes" :placeholder="t('sos.messagePlaceholder')" />
      </label>
      <p v-if="error" style="color: var(--danger)" role="alert">{{ error }}</p>
      <div class="table actions">
        <button class="sos-btn" :disabled="sending" @click="void trigger()">
          {{ sending ? t('sos.sending') : t('sos.confirmAlert') }}
        </button>
        <button class="btn ghost small" @click="open = false">{{ t('sos.cancel') }}</button>
      </div>
    </template>
  </div>
</template>
