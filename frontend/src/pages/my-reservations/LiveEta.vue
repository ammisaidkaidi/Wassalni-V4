<script setup lang="ts">
/** Task 4.3 — live ETA to this reservation's own dropoff, shown only once the trip is actually under way. */
import { onMounted, onUnmounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { ReservationEtaResult } from '../../types';

const props = defineProps<{ reservationId: string }>();

const { t } = useI18n();
const eta = ref<ReservationEtaResult | null>(null);
const err = ref('');
let interval: ReturnType<typeof setInterval> | undefined;

async function load(): Promise<void> {
  try {
    eta.value = await api<ReservationEtaResult>(`/api/reservations/${props.reservationId}/eta`);
  } catch (e) {
    err.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(() => {
  void load();
  interval = window.setInterval(() => void load(), 30_000);
});
onUnmounted(() => {
  if (interval) window.clearInterval(interval);
});

function reasonLabel(key: string): string {
  const translated = t(`etaReason.${key}`);
  return translated === `etaReason.${key}` ? key : translated;
}
</script>

<template>
  <div v-if="!err" class="meta">
    <span v-if="eta?.stop?.eta">{{ t('reservations.liveEtaArrival', { date: fmtDateTime(eta.stop.eta), distance: eta.stop.distance_km ?? '—' }) }}</span>
    <span v-else class="muted small">
      {{ t('reservations.liveEtaUnavailable', { reason: eta?.stop?.reason ? reasonLabel(eta.stop.reason) : t('reservations.etaGenericUnavailable') }) }}
    </span>
    <button class="btn ghost small" @click="void load()">{{ t('reservations.refresh') }}</button>
  </div>
</template>
