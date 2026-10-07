<script setup lang="ts">
/** Task 11.4 — shareable live-tracking link for this reservation. */
import { ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';

const props = defineProps<{ apiBase: string }>();

const { t } = useI18n();
const link = ref<string | null>(null);
const msg = ref('');
const busy = ref(false);

async function create(): Promise<void> {
  busy.value = true;
  msg.value = '';
  try {
    const r = await api<{ token: string }>(`${props.apiBase}/share-links`, { method: 'POST', body: {} });
    link.value = `${window.location.origin}/track/${r.token}`;
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

function copy(): void {
  if (link.value) void navigator.clipboard?.writeText(link.value);
}
</script>

<template>
  <span v-if="link" class="muted small">
    {{ t('reservationExtras.trackingLinkLabel') }}
    <a :href="link" target="_blank" rel="noreferrer">{{ link }}</a>
    <button class="btn ghost small" @click="copy">{{ t('reservationExtras.copy') }}</button>
  </span>
  <span v-else>
    <button class="btn ghost small" :disabled="busy" @click="void create()">{{ t('reservationExtras.shareTracking') }}</button>
    <span v-if="msg" class="muted small" role="alert"> {{ msg }}</span>
  </span>
</template>
