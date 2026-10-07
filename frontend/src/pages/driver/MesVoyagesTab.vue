<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import TripGroup from './TripGroup.vue';
import DriverTripDetail from './DriverTripDetail.vue';
import type { DriverTripRow } from '../../types';

const { t } = useI18n();
const trips = ref<DriverTripRow[]>([]);
const selectedId = ref<string | null>(null);
const msg = ref('');

async function load(): Promise<void> {
  try {
    const r = await api<{ trips: DriverTripRow[] }>('/api/driver/trips');
    trips.value = r.trips;
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(load);

const active = computed(() => trips.value.filter((tr) => tr.status === 'in_progress'));
const upcoming = computed(() => trips.value.filter((tr) => tr.status === 'scheduled'));
const history = computed(() => trips.value.filter((tr) => tr.status === 'completed' || tr.status === 'cancelled'));
const selected = computed(() => trips.value.find((tr) => tr.id === selectedId.value) ?? null);
</script>

<template>
  <div>
    <p v-if="msg" class="alert error" role="alert">{{ msg }}</p>
    <DriverTripDetail v-if="selected" :trip="selected" @back="selectedId = null" @changed="void load()" />
    <p v-else-if="trips.length === 0" class="empty">{{ t('driver.trips.noTripsAssigned') }}</p>
    <template v-else>
      <TripGroup :title="t('driver.trips.inProgress')" :trips="active" @open="(id) => (selectedId = id)" />
      <TripGroup :title="t('driver.trips.upcoming')" :trips="upcoming" @open="(id) => (selectedId = id)" />
      <TripGroup :title="t('driver.trips.history')" :trips="history" @open="(id) => (selectedId = id)" />
    </template>
  </div>
</template>
