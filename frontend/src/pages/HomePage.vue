<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { api, fmtDateTime } from '../api';
import { useI18n } from '../composables/useI18n';
import type { TripSearchRow, Wilaya } from '../types';

const { t, lang } = useI18n();
const wilayas = ref<Wilaya[]>([]);
const form = reactive({ from: '', to: '', dateFrom: '', dateTo: '' });
const results = ref<TripSearchRow[] | null>(null);
const total = ref(0);
const busy = ref(false);
const error = ref('');

onMounted(() => {
  api<{ wilayas: Wilaya[] }>('/api/registry/wilayas')
    .then((r) => {
      wilayas.value = r.wilayas;
    })
    .catch((e) => {
      error.value = e instanceof Error ? e.message : String(e);
    });
});

async function search(e: Event): Promise<void> {
  e.preventDefault();
  error.value = '';
  busy.value = true;
  try {
    const q = new URLSearchParams({ from: form.from, to: form.to });
    if (form.dateFrom) q.set('date_from', form.dateFrom);
    if (form.dateTo) q.set('date_to', form.dateTo);
    const r = await api<{ trips: TripSearchRow[]; total: number }>(`/api/trips?${q.toString()}`);
    results.value = r.trips;
    total.value = r.total;
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

function fmtPrice(trip: TripSearchRow): string {
  return Number(trip.price).toLocaleString(lang.value === 'ar' ? 'ar-DZ' : 'fr-DZ');
}
</script>

<template>
  <section>
    <div class="hero">
      <h1>{{ t('home.title') }}</h1>
      <p>{{ t('home.subtitle') }}</p>
    </div>

    <form class="card search-card" :aria-label="t('home.searchBtn')" @submit="void search($event)">
      <label for="home-from">
        {{ t('home.fromLabel') }}
        <select id="home-from" v-model="form.from" required>
          <option value="">{{ t('home.fromPlaceholder') }}</option>
          <option v-for="w in wilayas" :key="w.id" :value="String(w.id)">{{ String(w.id).padStart(2, '0') }} · {{ w.nom_fr }}</option>
        </select>
      </label>
      <label for="home-to">
        {{ t('home.toLabel') }}
        <select id="home-to" v-model="form.to" required>
          <option value="">{{ t('home.toPlaceholder') }}</option>
          <option v-for="w in wilayas" :key="w.id" :value="String(w.id)" :disabled="String(w.id) === form.from">
            {{ String(w.id).padStart(2, '0') }} · {{ w.nom_fr }}
          </option>
        </select>
      </label>
      <label for="home-date-from">
        {{ t('home.dateFromLabel') }}
        <input id="home-date-from" v-model="form.dateFrom" type="date" :max="form.dateTo || undefined" />
      </label>
      <label for="home-date-to">
        {{ t('home.dateToLabel') }}
        <input id="home-date-to" v-model="form.dateTo" type="date" :min="form.dateFrom || undefined" />
      </label>
      <button class="btn primary" :disabled="busy || !form.from || !form.to || form.from === form.to">
        {{ busy ? t('home.searching') : t('home.searchBtn') }}
      </button>
    </form>

    <p v-if="error" class="alert error" role="alert">{{ error }}</p>

    <div v-if="results !== null" class="results">
      <h2 aria-live="polite">{{ t('home.resultsCount', { count: total, s: total > 1 ? 's' : '' }) }}</h2>
      <p v-if="results.length === 0" class="empty">{{ t('home.noResults') }}</p>
      <div class="grid">
        <router-link v-for="trip in results" :key="trip.id" :to="`/trips/${trip.id}`" class="card trip-card">
          <div class="route">
            <strong>{{ trip.from_wilaya }}</strong>
            <span class="arrow" aria-hidden="true">→</span>
            <strong>{{ trip.to_wilaya }}</strong>
          </div>
          <div class="meta">
            <span>🕒 {{ fmtDateTime(trip.departure_at) }}</span>
            <span>🗺️ {{ trip.trajectory_name }}</span>
          </div>
          <div class="foot">
            <span class="price">{{ fmtPrice(trip) }} {{ trip.currency }}</span>
            <span class="seats">{{ t('home.seatsAvailable', { count: trip.seats_available ?? 0 }) }}</span>
          </div>
        </router-link>
      </div>
    </div>
  </section>
</template>
