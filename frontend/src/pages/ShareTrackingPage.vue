<script setup lang="ts">
/**
 * Task 11.4 — public, unauthenticated live-trip tracking page. Reachable via
 * the share link a customer/driver generates from their reservation
 * (`/track/:token`). Deliberately shows only status/ETA/position — no
 * names, phone numbers, or price (see get_shared_trip_info() in sql.txt).
 */
import { onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { ApiError, fmtDateTime } from '../api';
import { useI18n } from '../composables/useI18n';
import type { SharedTripInfo } from '../types';

const { t } = useI18n();
const route = useRoute();
const token = route.params.token as string | undefined;
const info = ref<SharedTripInfo | null>(null);
const error = ref('');

function statusLabel(key: string): string {
  const dict = t(`status.trip.${key}`);
  return dict === `status.trip.${key}` ? key : dict;
}

let interval: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  if (!token) return;
  const load = async (): Promise<void> => {
    try {
      const res = await fetch(`/api/share/${token}`);
      const data = await res.json();
      if (!res.ok) throw new ApiError(data?.error?.message ?? t('track.genericError'), data?.error?.code ?? 'UNKNOWN', res.status);
      info.value = data as SharedTripInfo;
      error.value = '';
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
    }
  };
  void load();
  interval = setInterval(load, 15_000);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>

<template>
  <section>
    <h1>{{ t('track.title') }}</h1>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p>
    <p v-if="!error && !info" class="empty">{{ t('track.loading') }}</p>
    <div v-if="info" class="card" style="max-width: 480px">
      <p><span class="pill">{{ statusLabel(info.trip_status) }}</span></p>
      <div class="meta">
        <span>{{ t('track.departure', { date: fmtDateTime(info.departure_at) }) }}</span>
        <span v-if="info.arrival_eta">{{ t('track.estimatedArrival', { date: fmtDateTime(info.arrival_eta) }) }}</span>
        <span>{{ t('track.seatsReserved', { count: info.seats }) }}</span>
        <span>{{ t('track.reservationStatus', { status: info.reservation_status }) }}</span>
      </div>
      <p v-if="info.driver_location" class="meta">
        {{ t('track.lastKnownPosition', {
          lat: info.driver_location.lat.toFixed(5),
          lon: info.driver_location.lon.toFixed(5),
          date: fmtDateTime(info.driver_location.recorded_at),
        }) }}
      </p>
      <p v-else class="empty">{{ t('track.positionUnavailable') }}</p>
    </div>
  </section>
</template>
