<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import TripMap from '../../components/TripMap.vue';
import type { MapPin, MapStop } from '../../components/TripMap.types';
import { RESERVATION_STATUS_COLOR } from './constants';
import type { DriverTripRow, Stop, StopManifestEntry, TripEtaResult, TripManifestRow, Wilaya } from '../../types';

interface CurrentTripDetailData {
  trip: DriverTripRow;
  stops: Stop[];
  manifest: TripManifestRow[];
  stop_manifest: StopManifestEntry[];
}

/** Picks the trip to feature: the one actively in_progress, else the soonest upcoming scheduled one. */
function pickCurrentTrip(trips: DriverTripRow[]): DriverTripRow | null {
  const inProgress = trips.find((tr) => tr.status === 'in_progress');
  if (inProgress) return inProgress;
  const upcoming = trips
    .filter((tr) => tr.status === 'scheduled')
    .sort((a, b) => new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime());
  return upcoming[0] ?? null;
}

const { t } = useI18n();
const trip = ref<DriverTripRow | null>(null);
const data = ref<CurrentTripDetailData | null>(null);
const wilayas = ref<Wilaya[]>([]);
const msg = ref('');
const loaded = ref(false);
const eta = ref<TripEtaResult | null>(null);
const etaMsg = ref('');
let etaInterval: ReturnType<typeof setInterval> | undefined;

async function load(): Promise<void> {
  try {
    const [tr, w] = await Promise.all([
      api<{ trips: DriverTripRow[] }>('/api/driver/trips'),
      api<{ wilayas: Wilaya[] }>('/api/registry/wilayas'),
    ]);
    wilayas.value = w.wilayas;
    const current = pickCurrentTrip(tr.trips);
    trip.value = current;
    if (current) {
      data.value = await api<CurrentTripDetailData>(`/api/driver/trips/${current.id}`);
    } else {
      data.value = null;
    }
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  } finally {
    loaded.value = true;
  }
}

onMounted(load);

async function loadEta(tripId: string): Promise<void> {
  try {
    eta.value = await api<TripEtaResult>(`/api/driver/trips/${tripId}/eta`);
  } catch (e) {
    etaMsg.value = e instanceof Error ? e.message : String(e);
  }
}

// Task 4.3 — live ETA: recompute on a short interval while the trip is
// in_progress (it's derived on read from the latest GPS ping, never
// stored, so re-fetching is the "update mechanism").
watch(
  trip,
  (tr) => {
    if (etaInterval) {
      clearInterval(etaInterval);
      etaInterval = undefined;
    }
    if (!tr || tr.status !== 'in_progress') {
      eta.value = null;
      return;
    }
    void loadEta(tr.id);
    etaInterval = setInterval(() => void loadEta(tr.id), 30_000);
  },
  { immediate: true },
);

onUnmounted(() => {
  if (etaInterval) clearInterval(etaInterval);
});

const wilayaCoords = computed(() => {
  const m = new Map<number, { lat: number; lon: number }>();
  for (const w of wilayas.value) if (w.lat != null && w.lon != null) m.set(w.id, { lat: w.lat, lon: w.lon });
  return m;
});

const mapStops = computed<MapStop[]>(() => {
  if (!data.value) return [];
  return data.value.stops
    .map((s) => {
      const c = wilayaCoords.value.get(s.wilaya_id);
      return c ? { id: s.id, label: s.nom_fr, lat: c.lat, lon: c.lon } : null;
    })
    .filter((s): s is MapStop => s !== null);
});

const mapPins = computed<MapPin[]>(() => {
  if (!data.value) return [];
  const pins: MapPin[] = [];
  for (const m of data.value.manifest) {
    const lat = m.pickup_lat != null ? Number(m.pickup_lat) : m.pickup_wilaya_id != null ? wilayaCoords.value.get(m.pickup_wilaya_id)?.lat : undefined;
    const lon = m.pickup_lon != null ? Number(m.pickup_lon) : m.pickup_wilaya_id != null ? wilayaCoords.value.get(m.pickup_wilaya_id)?.lon : undefined;
    if (lat == null || lon == null) continue;
    const precise = m.pickup_lat != null;
    pins.push({
      id: m.id,
      label: `${m.customer_name} — ${m.status}${precise ? '' : ' (approx.)'}`,
      lat,
      lon,
      color: RESERVATION_STATUS_COLOR[m.status] ?? '#6b7280',
    });
  }
  return pins;
});

const seatsReserved = computed(() => data.value?.manifest.reduce((n, m) => n + m.seats, 0) ?? 0);
</script>

<template>
  <p v-if="!loaded" class="empty">{{ t('driver.loading') }}</p>
  <p v-else-if="msg" class="alert error" role="alert">{{ msg }}</p>
  <p v-else-if="!trip" class="empty">{{ t('driver.current.noCurrentTrip') }}</p>
  <div v-else>
    <div class="card" style="margin-bottom: 16px">
      <h2 style="margin-top: 0">
        {{ trip.code }} — {{ trip.trajectory_name }} <span :class="`chip ${trip.status}`">{{ t(`status.trip.${trip.status}`) }}</span>
      </h2>
      <p class="muted">
        {{ t('driver.trips.departure') }} {{ fmtDateTime(trip.departure_at) }} · {{ t('driver.trips.seatsUnit', { n: trip.capacity }) }} ·
        {{ trip.vehicle_matricule ?? t('driver.trips.vehicleUnassigned') }} · {{ t('driver.current.seatsReserved', { count: seatsReserved }) }}
      </p>
    </div>

    <div class="card" style="margin-bottom: 16px">
      <h2 style="margin-top: 0">{{ t('driver.current.mapTitle') }}</h2>
      <p class="muted small">
        {{ t('driver.current.mapLegend') }}
        <span :style="{ color: RESERVATION_STATUS_COLOR.pending }">{{ t('driver.current.legendPending') }}</span>
        <span :style="{ color: RESERVATION_STATUS_COLOR.confirmed }">{{ t('driver.current.legendConfirmed') }}</span>
        <span :style="{ color: RESERVATION_STATUS_COLOR.completed }">{{ t('driver.current.legendCompleted') }}</span>.
        {{ t('driver.current.mapApproxNote') }}
      </p>
      <p v-if="mapStops.length === 0" class="empty">{{ t('driver.current.noMapCoords') }}</p>
      <TripMap v-else :stops="mapStops" :pins="mapPins" :height="420" />
    </div>

    <div class="card" style="margin-bottom: 16px">
      <h2 style="margin-top: 0">{{ t('driver.current.etaTitle') }}</h2>
      <p v-if="etaMsg" class="alert error" role="alert">{{ etaMsg }}</p>
      <p v-if="trip.status !== 'in_progress'" class="muted small">{{ t('driver.etaReason.not_in_progress') }}</p>
      <template v-else>
        <p class="muted small">
          {{
            eta?.position_age_seconds != null
              ? t('driver.current.positionReceivedAgo', { minutes: Math.round(eta.position_age_seconds / 60) })
              : t('driver.current.waitingForGps')
          }}
          <button class="btn ghost small" @click="void loadEta(trip.id)">{{ t('driver.current.refresh') }}</button>
        </p>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>{{ t('driver.current.stop') }}</th>
                <th>{{ t('driver.current.distance') }}</th>
                <th>{{ t('driver.current.estimatedArrival') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in eta?.stops ?? []" :key="s.wpoint_id">
                <td>{{ s.wpoint_name }}</td>
                <td>{{ s.distance_km != null ? `${s.distance_km} km` : '—' }}</td>
                <td>
                  <template v-if="s.eta">{{ fmtDateTime(s.eta) }}</template>
                  <span v-else class="muted small">{{ s.reason ? t(`driver.etaReason.${s.reason}`) : '—' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="muted small">{{ t('driver.current.etaApproxNote') }}</p>
      </template>
    </div>

    <div class="card" style="margin-bottom: 16px">
      <h2 style="margin-top: 0">{{ t('driver.current.manifestTitle') }}</h2>
      <p v-if="!data || data.stop_manifest.length === 0" class="empty">{{ t('driver.current.noStopsForTrip') }}</p>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('driver.current.stop') }}</th>
              <th>{{ t('driver.current.boarding') }}</th>
              <th>{{ t('driver.current.alighting') }}</th>
              <th>{{ t('driver.current.seatsIn') }}</th>
              <th>{{ t('driver.current.seatsOut') }}</th>
              <th>{{ t('driver.current.aboardAfter') }}</th>
              <th>{{ t('driver.current.remainingSeats') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in data!.stop_manifest" :key="s.wpoint_id">
              <td>{{ s.wpoint_name }}</td>
              <td>{{ s.boarding.length === 0 ? '—' : s.boarding.map((p) => `${p.customer_name} (${p.seats})`).join(', ') }}</td>
              <td>{{ s.alighting.length === 0 ? '—' : s.alighting.map((p) => `${p.customer_name} (${p.seats})`).join(', ') }}</td>
              <td>{{ s.seats_entering }}</td>
              <td>{{ s.seats_leaving }}</td>
              <td>{{ s.seats_aboard_after }}</td>
              <td>{{ s.remaining_capacity }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top: 0">{{ t('driver.current.reservationsTitle', { count: data?.manifest.length ?? 0 }) }}</h2>
      <p v-if="!data || data.manifest.length === 0" class="empty">{{ t('driver.trips.noReservations') }}</p>
      <div v-else class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('driver.trips.customer') }}</th>
              <th>{{ t('driver.trips.phone') }}</th>
              <th>{{ t('driver.trips.seats') }}</th>
              <th>{{ t('driver.trips.pickup') }}</th>
              <th>{{ t('driver.trips.dropoff') }}</th>
              <th>{{ t('driver.current.positionCol') }}</th>
              <th>{{ t('driver.trips.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in data!.manifest" :key="m.id">
              <td>{{ m.customer_name }}</td>
              <td>{{ m.customer_phone }}</td>
              <td>{{ m.seats }}</td>
              <td>{{ m.pickup ?? '—' }}</td>
              <td>{{ m.dropoff ?? '—' }}</td>
              <td>{{ m.pickup_lat != null ? t('driver.current.precise') : t('driver.current.approximate') }}</td>
              <td><span :class="`chip ${m.status}`">{{ t(`status.reservation.${m.status}`) }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
