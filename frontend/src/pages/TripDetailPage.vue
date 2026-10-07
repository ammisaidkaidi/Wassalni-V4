<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError, api, fmtDateTime } from '../api';
import { useAuth } from '../composables/useAuth';
import SeatPicker from '../components/SeatPicker.vue';
import { useI18n } from '../composables/useI18n';
import TripMap from '../components/TripMap.vue';
import type { MapPin, MapStop } from '../components/TripMap.types';
import type { CommuneRow, TripDetail, Wilaya } from '../types';

type PickMode = 'pickup' | 'dropoff';

function stopsWilaya(data: TripDetail | null, wpointId: string): number | undefined {
  return data?.stops.find((s) => s.id === wpointId)?.wilaya_id;
}

const { t, lang } = useI18n();
const locale = computed(() => (lang.value === 'ar' ? 'ar-DZ' : 'fr-DZ'));
const route = useRoute();
const id = route.params.id as string | undefined;
const router = useRouter();
const { user } = useAuth();
const data = ref<TripDetail | null>(null);
const wilayas = ref<Wilaya[]>([]);
const pickup = ref('');
const dropoff = ref('');
const seats = ref(1);
const error = ref('');
const done = ref('');
const favMsg = ref('');
const waitlistMsg = ref('');
const joiningWaitlist = ref(false);

const showMap = ref(false);
const pickMode = ref<PickMode>('pickup');
const pickupPos = ref<{ lat: number; lon: number } | null>(null);
const dropoffPos = ref<{ lat: number; lon: number } | null>(null);
const geoMsg = ref('');
// Remaining capacity for exactly the chosen pickup->dropoff segment (Task
// 2.3) — the trip's flat seats_available is only a whole-route bottleneck
// and can understate what's really free on a shorter segment.
const segmentSeats = ref<number | null>(null);

// Task 4.1 — optional precise Commune within the chosen pickup/dropoff
// stop. Scoped to exactly what that stop actually serves (the admin's
// curated wpoint_commune subset when one is configured, otherwise every
// commune of the stop's wilaya) so the customer can't pick a commune the
// server would reject anyway.
const pickupCommuneId = ref('');
const dropoffCommuneId = ref('');
const pickupCommunes = ref<CommuneRow[]>([]);
const dropoffCommunes = ref<CommuneRow[]>([]);

if (id) {
  Promise.all([api<TripDetail>(`/api/trips/${id}`), api<{ wilayas: Wilaya[] }>('/api/registry/wilayas')])
    .then(([d, w]) => {
      data.value = d;
      wilayas.value = w.wilayas;
      pickup.value = d.stops[0]?.id ?? '';
      dropoff.value = d.stops[d.stops.length - 1]?.id ?? '';
    })
    .catch((e) => {
      error.value = e instanceof Error ? e.message : String(e);
    });
}

// Picking different stops invalidates any exact pin placed for that side —
// the pin must stay consistent with the chosen wilaya-level stop.
watch(pickup, () => {
  pickupPos.value = null;
  pickupCommuneId.value = '';
});
watch(dropoff, () => {
  dropoffPos.value = null;
  dropoffCommuneId.value = '';
});

// Resolve the set of Communes this particular stop actually serves (Task
// 4.1): fetch the curated wpoint_commune subset; if it's empty (no
// restriction configured — same convention as the admin WPoint editor),
// fall back to every commune of the stop's wilaya instead.
function loadStopCommunes(wpointId: string, wilayaId: number | undefined, target: typeof pickupCommunes): void {
  if (!id || !wpointId || !wilayaId) {
    target.value = [];
    return;
  }
  Promise.all([
    api<{ commune_ids: number[] }>(`/api/trips/${id}/wpoints/${wpointId}/communes`),
    api<{ communes: CommuneRow[] }>(`/api/registry/wilayas/${wilayaId}/communes`),
  ])
    .then(([restricted, all]) => {
      target.value = restricted.commune_ids.length > 0 ? all.communes.filter((c) => restricted.commune_ids.includes(c.id)) : all.communes;
    })
    .catch(() => {
      target.value = [];
    });
}

watch(
  [pickup, data],
  () => loadStopCommunes(pickup.value, stopsWilaya(data.value, pickup.value), pickupCommunes),
  { immediate: true },
);
watch(
  [dropoff, data],
  () => loadStopCommunes(dropoff.value, stopsWilaya(data.value, dropoff.value), dropoffCommunes),
  { immediate: true },
);

watch(
  [pickup, dropoff],
  () => {
    if (!id || !pickup.value || !dropoff.value) {
      segmentSeats.value = null;
      return;
    }
    api<{ seats_available: number | null }>(`/api/trips/${id}/availability?from_wpoint_id=${pickup.value}&to_wpoint_id=${dropoff.value}`)
      .then((r) => {
        segmentSeats.value = r.seats_available;
      })
      .catch(() => {
        segmentSeats.value = null;
      });
  },
  { immediate: true },
);

const pricePair = computed(() => data.value?.prices.find((p) => p.from_wpoint_id === pickup.value && p.to_wpoint_id === dropoff.value) ?? null);
const total = computed(() => (pricePair.value ? Number(pricePair.value.price) * seats.value : null));
const maxSeats = computed(() => Math.min(30, segmentSeats.value ?? data.value?.trip.seats_available ?? 30));

// Keep the seat-count input in range if the segment's capacity shrinks
// below whatever the customer already had selected.
watch(maxSeats, (max) => {
  seats.value = Math.max(1, Math.min(seats.value, Math.max(max, 1)));
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

const pickedMarkers = computed<MapPin[]>(() => {
  const pins: MapPin[] = [];
  if (pickupPos.value) pins.push({ id: 'pickup', label: t('tripDetail.pickupPinLabel'), lat: pickupPos.value.lat, lon: pickupPos.value.lon, color: '#16a34a' });
  if (dropoffPos.value) pins.push({ id: 'dropoff', label: t('tripDetail.dropoffPinLabel'), lat: dropoffPos.value.lat, lon: dropoffPos.value.lon, color: '#dc2626' });
  return pins;
});

function onMapPick(lat: number, lon: number): void {
  if (pickMode.value === 'pickup') pickupPos.value = { lat, lon };
  else dropoffPos.value = { lat, lon };
}

// Task 4.1 — "use my current position" as the primary way to set an exact
// pin, with the existing click-on-map picker (above) as the explicit
// manual fallback whenever geolocation is denied, unavailable, or just
// not precise enough for the customer's liking.
function locateMe(): void {
  geoMsg.value = '';
  if (!('geolocation' in navigator)) {
    geoMsg.value = t('tripDetail.geoUnsupported');
    showMap.value = true;
    return;
  }
  geoMsg.value = t('tripDetail.geoLocating');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      onMapPick(pos.coords.latitude, pos.coords.longitude);
      showMap.value = true;
      geoMsg.value = t('tripDetail.geoDetected');
    },
    (err) => {
      const denied = err.code === err.PERMISSION_DENIED;
      geoMsg.value = denied ? t('tripDetail.geoDenied') : t('tripDetail.geoFailed');
      showMap.value = true;
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

async function book(): Promise<void> {
  if (!user.value) {
    void router.push(`/login?next=/trips/${id}`);
    return;
  }
  error.value = '';
  try {
    await api('/api/reservations', {
      method: 'POST',
      body: {
        trip_id: id,
        seats: seats.value,
        pickup_wpoint_id: pickup.value,
        dropoff_wpoint_id: dropoff.value,
        pickup_lat: pickupPos.value?.lat ?? null,
        pickup_lon: pickupPos.value?.lon ?? null,
        dropoff_lat: dropoffPos.value?.lat ?? null,
        dropoff_lon: dropoffPos.value?.lon ?? null,
        pickup_commune_id: pickupCommuneId.value ? Number(pickupCommuneId.value) : null,
        dropoff_commune_id: dropoffCommuneId.value ? Number(dropoffCommuneId.value) : null,
      },
    });
    done.value = t('tripDetail.bookingConfirmed');
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      void router.push(`/login?next=/trips/${id}`);
      return;
    }
    error.value = e instanceof Error ? e.message : String(e);
  }
}

// Task 10.5 — favorite this pickup/dropoff pair for quick rebooking later.
async function addFavoriteRoute(): Promise<void> {
  if (!user.value) {
    void router.push(`/login?next=/trips/${id}`);
    return;
  }
  favMsg.value = '';
  try {
    await api('/api/customer/favorites/routes', { method: 'POST', body: { origin_wpoint_id: pickup.value, destination_wpoint_id: dropoff.value } });
    favMsg.value = t('tripDetail.favoriteAdded');
  } catch (e) {
    favMsg.value = e instanceof Error ? e.message : String(e);
  }
}

// Task 10.2 — when the chosen segment has no free seats, offer the waitlist instead.
async function joinWaitlist(): Promise<void> {
  if (!user.value) {
    void router.push(`/login?next=/trips/${id}`);
    return;
  }
  waitlistMsg.value = '';
  joiningWaitlist.value = true;
  try {
    await api('/api/customer/waitlist', { method: 'POST', body: { trip_id: id, seats: seats.value, pickup_wpoint_id: pickup.value, dropoff_wpoint_id: dropoff.value } });
    waitlistMsg.value = t('tripDetail.waitlistJoined');
  } catch (e) {
    waitlistMsg.value = e instanceof Error ? e.message : String(e);
  } finally {
    joiningWaitlist.value = false;
  }
}

function onSeatChange(n: number): void {
  seats.value = Math.max(1, Math.min(maxSeats.value, n));
}
</script>

<template>
  <p v-if="error" class="alert error" role="alert">{{ error }}</p>
  <p v-else-if="!data" class="empty">{{ t('tripDetail.loading') }}</p>
  <section v-else class="detail">
    <h1>{{ data.trip.trajectory_name }} <span class="chip">{{ data.trip.code }}</span></h1>
    <p class="meta">
      {{ t('tripDetail.headerMeta', {
        departure: fmtDateTime(data.trip.departure_at),
        arrival: fmtDateTime(data.trip.arrival_eta),
        driver: data.trip.driver_name ?? '—',
        vehicle: data.trip.vehicle_matricule ?? '—',
      }) }}
    </p>

    <div class="detail-grid">
      <div class="card">
        <h2>{{ t('tripDetail.itinerary') }}</h2>
        <ol class="stops">
          <li v-for="s in data.stops" :key="s.id" :class="s.id === pickup ? 'stop from' : s.id === dropoff ? 'stop to' : ''">
            <span class="dot" />
            <div>
              <strong>{{ s.nom_fr }}</strong> <span class="muted">({{ s.nom_ar }})</span>
              <div class="muted">{{ fmtDateTime(s.eta) }}</div>
            </div>
          </li>
        </ol>
      </div>

      <div class="card booking">
        <h2>{{ t('tripDetail.bookCard') }}</h2>
        <label for="trip-pickup">
          {{ t('tripDetail.pickup') }}
          <select id="trip-pickup" v-model="pickup">
            <option v-for="s in data.stops" :key="s.id" :value="s.id">{{ s.nom_fr }}</option>
          </select>
        </label>
        <label for="trip-dropoff">
          {{ t('tripDetail.dropoff') }}
          <select id="trip-dropoff" v-model="dropoff">
            <option v-for="s in data.stops" :key="s.id" :value="s.id" :disabled="s.id === pickup">{{ s.nom_fr }}</option>
          </select>
        </label>
        <label for="trip-pickup-commune">
          {{ t('tripDetail.pickupCommune') }} <span class="muted small">{{ t('tripDetail.optional') }}</span>
          <select id="trip-pickup-commune" v-model="pickupCommuneId">
            <option value="">{{ t('tripDetail.anyCommune') }}</option>
            <option v-for="c in pickupCommunes" :key="c.id" :value="String(c.id)">{{ c.nom_fr }}</option>
          </select>
        </label>
        <label for="trip-dropoff-commune">
          {{ t('tripDetail.dropoffCommune') }} <span class="muted small">{{ t('tripDetail.optional') }}</span>
          <select id="trip-dropoff-commune" v-model="dropoffCommuneId">
            <option value="">{{ t('tripDetail.anyCommune') }}</option>
            <option v-for="c in dropoffCommunes" :key="c.id" :value="String(c.id)">{{ c.nom_fr }}</option>
          </select>
        </label>
        <div class="form-inline" style="margin-bottom: 8px">
          <button type="button" class="btn ghost small" @click="void addFavoriteRoute()">{{ t('tripDetail.addFavorite') }}</button>
        </div>
        <p v-if="favMsg" class="muted small" style="margin-top: -4px; margin-bottom: 8px" role="status">{{ favMsg }}</p>

        <label id="trip-seats-label">{{ t('tripDetail.seatsLabel') }}</label>
        <SeatPicker :capacity="data.trip.capacity" :available="maxSeats" :selected="seats" @change="onSeatChange" />

        <div class="form-inline" style="margin-bottom: 8px; flex-wrap: wrap; gap: 8px">
          <button type="button" class="btn ghost small" @click="locateMe">{{ t('tripDetail.useMyPosition') }}</button>
          <button type="button" class="btn ghost small" @click="showMap = !showMap">{{ showMap ? t('tripDetail.hideMap') : t('tripDetail.showMap') }}</button>
        </div>
        <p v-if="geoMsg" class="muted small" style="margin-top: -4px; margin-bottom: 8px" role="status">{{ geoMsg }}</p>

        <div v-if="showMap" style="margin-bottom: 12px">
          <div class="form-inline" style="margin-bottom: 8px">
            <label style="flex-direction: row; align-items: center; gap: 6px">
              <input type="radio" name="pickmode" :checked="pickMode === 'pickup'" @change="pickMode = 'pickup'" />
              {{ t('tripDetail.placePickupPoint') }}
            </label>
            <label style="flex-direction: row; align-items: center; gap: 6px">
              <input type="radio" name="pickmode" :checked="pickMode === 'dropoff'" @change="pickMode = 'dropoff'" />
              {{ t('tripDetail.placeDropoffPoint') }}
            </label>
          </div>
          <p class="muted small">{{ t('tripDetail.mapHint') }}</p>
          <TripMap :stops="mapStops" :picked-markers="pickedMarkers" :height="320" @pick="onMapPick" />
        </div>

        <div class="total">
          <template v-if="pricePair">
            <span>{{ Number(pricePair.price).toLocaleString(locale) }} {{ pricePair.currency }} × {{ seats }}</span>
            <strong>{{ total?.toLocaleString(locale) }} {{ pricePair.currency }}</strong>
          </template>
          <span v-else class="muted">{{ t('tripDetail.noFare') }}</span>
        </div>
        <p v-if="done" class="alert success" role="status">{{ done }}</p>
        <template v-else-if="maxSeats < 1 && pricePair">
          <p class="muted small">{{ t('tripDetail.full') }}</p>
          <p v-if="waitlistMsg" class="alert success" role="status">{{ waitlistMsg }}</p>
          <button v-else class="btn primary wide" :disabled="joiningWaitlist" @click="void joinWaitlist()">
            {{ joiningWaitlist ? t('tripDetail.joiningWaitlist') : t('tripDetail.joinWaitlist') }}
          </button>
        </template>
        <button v-else class="btn primary wide" :disabled="!pricePair || maxSeats < 1" @click="void book()">
          {{ user ? t('tripDetail.bookBtn') : t('tripDetail.loginToBook') }}
        </button>
      </div>
    </div>
  </section>
</template>
