<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import { ConversationAction, RevealContactAction } from '../../components/reservation-extras';
import WaitlistPanel from './WaitlistPanel.vue';
import type { DriverTripRow, PricePair, Stop, TripManifestRow } from '../../types';

interface DriverTripDetailData {
  trip: DriverTripRow;
  stops: Stop[];
  prices: PricePair[];
  manifest: TripManifestRow[];
}

const props = defineProps<{ trip: DriverTripRow }>();
const emit = defineEmits<{ back: []; changed: [] }>();

const { t } = useI18n();
const data = ref<DriverTripDetailData | null>(null);
const msg = ref('');
const busy = ref(false);
const sharing = ref(false);
const lastSent = ref<string | null>(null);
let watchId: number | null = null;
let lastSendAt = 0;

async function load(): Promise<void> {
  try {
    data.value = await api<DriverTripDetailData>(`/api/driver/trips/${props.trip.id}`);
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(load);
watch(() => props.trip.id, load);

function stopSharing(): void {
  if (watchId !== null && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
  sharing.value = false;
}

// Stop pushing GPS if we navigate away from this trip's detail view.
onUnmounted(() => stopSharing());

function toggleSharing(): void {
  if (sharing.value) {
    stopSharing();
    return;
  }
  if (!('geolocation' in navigator)) {
    msg.value = t('driver.trips.geoUnsupported');
    return;
  }
  msg.value = '';
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      const now = Date.now();
      if (now - lastSendAt < 10_000) return; // throttle: at most 1 push / 10s
      lastSendAt = now;
      api(`/api/driver/trips/${props.trip.id}/location`, {
        method: 'POST',
        body: { gps_lat: pos.coords.latitude, gps_lon: pos.coords.longitude },
      })
        .then(() => {
          lastSent.value = new Date().toLocaleTimeString('fr-FR');
        })
        .catch((e) => {
          msg.value = e instanceof Error ? e.message : String(e);
        });
    },
    (err) => {
      msg.value = t('driver.trips.geoError', { message: err.message });
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20_000 },
  );
  watchId = id;
  sharing.value = true;
}

async function start(): Promise<void> {
  busy.value = true;
  msg.value = '';
  try {
    await api(`/api/driver/trips/${props.trip.id}/start`, { method: 'POST' });
    await load();
    emit('changed');
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

async function complete(): Promise<void> {
  busy.value = true;
  msg.value = '';
  try {
    stopSharing();
    await api(`/api/driver/trips/${props.trip.id}/complete`, { method: 'POST' });
    await load();
    emit('changed');
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

async function cancel(): Promise<void> {
  if (!confirm(t('driver.trips.confirmCancel'))) return;
  busy.value = true;
  msg.value = '';
  try {
    await api(`/api/driver/trips/${props.trip.id}/cancel`, { method: 'POST' });
    await load();
    emit('changed');
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}

const status = computed(() => data.value?.trip.status ?? props.trip.status);
</script>

<template>
  <div class="card">
    <button class="btn ghost small" style="margin-bottom: 12px" @click="emit('back')">{{ t('driver.trips.back') }}</button>
    <h2 style="margin-top: 0">{{ trip.code }} — {{ trip.trajectory_name }}</h2>
    <p class="muted">
      {{ t('driver.trips.departure') }} {{ fmtDateTime(trip.departure_at) }} · {{ t('driver.trips.seatsUnit', { n: trip.capacity }) }} ·
      {{ trip.vehicle_matricule ?? t('driver.trips.vehicleUnassigned') }} · {{ t('driver.trips.statusLabel') }}
      <strong>{{ t(`status.trip.${status}`) }}</strong>
    </p>

    <p v-if="msg" class="alert error" role="alert">{{ msg }}</p>

    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px">
      <template v-if="status === 'scheduled'">
        <button class="btn primary" :disabled="busy" @click="void start()">{{ t('driver.trips.startTrip') }}</button>
        <button class="btn danger" :disabled="busy" @click="void cancel()">{{ t('driver.trips.cancelTrip') }}</button>
      </template>
      <template v-if="status === 'in_progress'">
        <button :class="`btn ${sharing ? 'danger' : 'primary'}`" @click="toggleSharing">
          {{ sharing ? t('driver.trips.stopSharing') : t('driver.trips.shareLocation') }}
        </button>
        <button class="btn ghost" :disabled="busy" @click="void complete()">{{ t('driver.trips.completeTrip') }}</button>
      </template>
    </div>
    <p v-if="sharing" class="muted">
      {{ t('driver.trips.sharingLive') }}{{ lastSent ? t('driver.trips.lastSent', { time: lastSent }) : '…' }}
    </p>

    <template v-if="data">
      <h3>{{ t('driver.trips.stops') }}</h3>
      <ol>
        <li v-for="s in data.stops" :key="s.id">
          {{ s.nom_fr }}{{ s.eta ? `${t('driver.trips.etaPrefix')}${fmtDateTime(s.eta)}` : '' }}
        </li>
      </ol>

      <h3>{{ t('driver.trips.passengers', { seats: data.manifest.reduce((n, m) => n + m.seats, 0) }) }}</h3>
      <p v-if="data.manifest.length === 0" class="muted">{{ t('driver.trips.noReservations') }}</p>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('driver.trips.customer') }}</th>
              <th>{{ t('driver.trips.phone') }}</th>
              <th>{{ t('driver.trips.seats') }}</th>
              <th>{{ t('driver.trips.pickup') }}</th>
              <th>{{ t('driver.trips.dropoff') }}</th>
              <th>{{ t('driver.trips.status') }}</th>
              <th>{{ t('driver.trips.contact') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in data.manifest" :key="m.id">
              <td>{{ m.customer_name }}</td>
              <td>{{ m.customer_phone }}</td>
              <td>{{ m.seats }}</td>
              <td>{{ m.pickup ?? '—' }}</td>
              <td>{{ m.dropoff ?? '—' }}</td>
              <td>{{ t(`status.reservation.${m.status}`) }}</td>
              <td style="display: flex; gap: 4px; flex-wrap: wrap">
                <ConversationAction :api-base="`/api/driver/reservations/${m.id}`" my-role="driver" />
                <RevealContactAction :api-base="`/api/driver/reservations/${m.id}`" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <WaitlistPanel :trip-id="trip.id" />
    </template>
  </div>
</template>
