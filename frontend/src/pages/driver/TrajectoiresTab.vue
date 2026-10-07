<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import WpointManager from '../../components/WpointManager.vue';
import type { TrajectoryRow, Wilaya, WpointRow } from '../../types';

const { t } = useI18n();
const rows = ref<TrajectoryRow[]>([]);
const wilayas = ref<Wilaya[]>([]);
const selected = ref('');
const wpoints = ref<WpointRow[]>([]);
const name = ref('');
const price = ref({ from: '', to: '', amount: '' });
const tripForm = ref({ departure_at: '', capacity: '4', seat_price: '0' });
const msg = ref('');
const lastTripId = ref<string | null>(null);

async function load(): Promise<void> {
  const [tr, w] = await Promise.all([
    api<{ trajectories: TrajectoryRow[] }>('/api/driver/trajectories'),
    api<{ wilayas: Wilaya[] }>('/api/registry/wilayas'),
  ]);
  rows.value = tr.trajectories;
  wilayas.value = w.wilayas;
}

onMounted(() => {
  load().catch((e) => {
    msg.value = e instanceof Error ? e.message : String(e);
  });
});

watch(selected, () => {
  price.value = { from: '', to: '', amount: '' };
});

async function create(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    const r = await api<{ id: string }>('/api/driver/trajectories', { method: 'POST', body: { name: name.value } });
    name.value = '';
    msg.value = t('driver.trajectories.trajectoryCreated');
    await load();
    selected.value = r.id;
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function setDefaultPrice(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api(`/api/driver/trajectories/${selected.value}/prices`, {
      method: 'POST',
      body: { from_wpoint_id: price.value.from, to_wpoint_id: price.value.to, price: Number(price.value.amount) },
    });
    msg.value = t('driver.trajectories.defaultPriceSaved');
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function createTrip(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    const r = await api<{ id: string }>('/api/driver/trips', {
      method: 'POST',
      body: {
        trajectory_id: selected.value,
        departure_at: new Date(tripForm.value.departure_at).toISOString(),
        capacity: Number(tripForm.value.capacity),
        seat_price: Number(tripForm.value.seat_price),
      },
    });
    lastTripId.value = r.id;
    msg.value = t('driver.trajectories.tripCreatedDraft');
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function populateAndPublish(): Promise<void> {
  if (!lastTripId.value) return;
  msg.value = '';
  try {
    await api(`/api/driver/trips/${lastTripId.value}/stops`, { method: 'POST', body: {} });
    await api(`/api/driver/trips/${lastTripId.value}/prices/populate`, { method: 'POST', body: {} });
    await api(`/api/driver/trips/${lastTripId.value}/publish`, { method: 'POST', body: {} });
    msg.value = t('driver.trajectories.tripPublished');
    lastTripId.value = null;
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <div>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <form class="card form-inline" @submit="void create($event)">
      <label for="driver-new-trajectory">
        {{ t('driver.trajectories.newTrajectory') }}
        <input id="driver-new-trajectory" v-model="name" required minlength="2" :placeholder="t('driver.trajectories.namePlaceholder')" />
      </label>
      <button class="btn primary">{{ t('driver.trajectories.create') }}</button>
    </form>

    <div class="form-inline select-row">
      <label for="driver-trajectory-select">
        {{ t('driver.trajectories.manage') }}
        <select id="driver-trajectory-select" v-model="selected">
          <option value="">{{ t('driver.trajectories.pickTrajectory') }}</option>
          <option v-for="tr in rows" :key="tr.id" :value="tr.id">{{ tr.name }} ({{ t('driver.trajectories.stopsCount', { n: tr.nb_wpoints }) }})</option>
        </select>
      </label>
    </div>

    <div v-if="selected" class="detail-grid">
      <div class="card">
        <h2>{{ t('driver.trajectories.stopsTitle') }}</h2>
        <WpointManager base-path="/api/driver" :trajectory-id="selected" :wilayas="wilayas" @wpoints-change="(w) => (wpoints = w)" />
      </div>

      <div class="card">
        <h2>{{ t('driver.trajectories.defaultPriceTitle') }}</h2>
        <form class="form-grid" @submit="void setDefaultPrice($event)">
          <label for="driver-price-from">
            {{ t('driver.trajectories.from') }}
            <select id="driver-price-from" v-model="price.from" required>
              <option value="">{{ t('driver.trajectories.pickOption') }}</option>
              <option v-for="w in wpoints" :key="w.id" :value="w.id">{{ w.nom_fr }}</option>
            </select>
          </label>
          <label for="driver-price-to">
            {{ t('driver.trajectories.to') }}
            <select id="driver-price-to" v-model="price.to" required>
              <option value="">{{ t('driver.trajectories.pickOption') }}</option>
              <option v-for="w in wpoints" :key="w.id" :value="w.id">{{ w.nom_fr }}</option>
            </select>
          </label>
          <label for="driver-price-amount">
            {{ t('driver.trajectories.price') }}
            <input id="driver-price-amount" v-model="price.amount" type="number" min="0" required />
          </label>
          <button class="btn primary">{{ t('driver.trajectories.save') }}</button>
        </form>
      </div>

      <div class="card">
        <h2>{{ t('driver.trajectories.createTripTitle') }}</h2>
        <form class="form-grid" @submit="void createTrip($event)">
          <label for="driver-trip-departure">
            {{ t('driver.trajectories.departure') }}
            <input id="driver-trip-departure" v-model="tripForm.departure_at" type="datetime-local" required />
          </label>
          <label for="driver-trip-capacity">
            {{ t('driver.trajectories.capacity') }}
            <input id="driver-trip-capacity" v-model="tripForm.capacity" type="number" min="1" required />
          </label>
          <label for="driver-trip-seat-price">
            {{ t('driver.trajectories.fallbackPrice') }}
            <input id="driver-trip-seat-price" v-model="tripForm.seat_price" type="number" min="0" step="0.01" />
          </label>
          <button class="btn primary">{{ t('driver.trajectories.createTrip') }}</button>
        </form>
        <p v-if="lastTripId" class="muted" style="margin-top: 12px">
          {{ t('driver.trajectories.tripCreated') }}
          <button class="btn ghost small" @click="void populateAndPublish()">{{ t('driver.trajectories.populateAndPublish') }}</button>
        </p>
      </div>
    </div>
  </div>
</template>
