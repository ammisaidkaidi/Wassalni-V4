<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { DriverRow, TrajectoryRow, VehicleRow } from '../../types';

interface TripRow {
  id: string;
  code: string;
  status: string;
  published_at: string | null;
  departure_at: string;
  capacity: number;
  seat_price: string;
  currency: string;
  driver_name: string | null;
  vehicle_matricule: string | null;
  trajectory_name: string;
  seats_available: number | null;
  nb_active_reservations: number | string;
}

const { t } = useI18n();
const trips = ref<TripRow[]>([]);
const trajectories = ref<TrajectoryRow[]>([]);
const drivers = ref<DriverRow[]>([]);
const vehicles = ref<VehicleRow[]>([]);
const form = ref({ trajectory_id: '', driver_id: '', vehicle_id: '', departure_at: '', capacity: '20', seat_price: '0' });
const msg = ref('');

async function load(): Promise<void> {
  const [tr, tj, d, v] = await Promise.all([
    api<{ trips: TripRow[] }>('/api/admin/trips'),
    api<{ trajectories: TrajectoryRow[] }>('/api/admin/trajectories'),
    api<{ drivers: DriverRow[] }>('/api/admin/drivers'),
    api<{ vehicles: VehicleRow[] }>('/api/admin/vehicles'),
  ]);
  trips.value = tr.trips;
  trajectories.value = tj.trajectories;
  drivers.value = d.drivers;
  vehicles.value = v.vehicles;
}

onMounted(() => {
  load().catch((e) => {
    msg.value = e instanceof Error ? e.message : String(e);
  });
});

async function create(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api('/api/admin/trips', {
      method: 'POST',
      body: {
        trajectory_id: form.value.trajectory_id,
        driver_id: form.value.driver_id || null,
        vehicle_id: form.value.vehicle_id || null,
        departure_at: new Date(form.value.departure_at).toISOString(),
        capacity: Number(form.value.capacity),
        seat_price: Number(form.value.seat_price),
      },
    });
    msg.value = t('admin.trips.created');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function act(id: string, action: string): Promise<void> {
  msg.value = '';
  try {
    await api(`/api/admin/trips/${id}/${action}`, { method: 'POST', body: {} });
    msg.value = t('admin.trips.actionOk', { action });
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

// Task 5.3 — the driver never started a scheduled trip: record the strike
// (flag-only — see NoShowTab) and cancel the trip since it can't proceed.
async function reportDriverNoShow(id: string): Promise<void> {
  if (!confirm(t('admin.trips.noShowConfirm'))) return;
  const notes = window.prompt(t('admin.trips.noShowNotePrompt'), '') ?? undefined;
  msg.value = '';
  try {
    await api(`/api/admin/trips/${id}/driver-no-show`, { method: 'POST', body: { notes } });
    msg.value = t('admin.trips.noShowRecorded');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <div>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <form class="card form-grid" @submit="void create($event)">
      <label for="admin-trip-trajectory">
        {{ t('admin.trips.trajectoryLabel') }}
        <select id="admin-trip-trajectory" v-model="form.trajectory_id" required>
          <option value="">{{ t('admin.common.pickOption') }}</option>
          <option v-for="tr in trajectories" :key="tr.id" :value="tr.id">{{ tr.name }}</option>
        </select>
      </label>
      <label for="admin-trip-driver">
        {{ t('admin.trips.driverLabel') }}
        <select id="admin-trip-driver" v-model="form.driver_id">
          <option value="">{{ t('admin.common.pickOption') }}</option>
          <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.full_name }}</option>
        </select>
      </label>
      <label for="admin-trip-vehicle">
        {{ t('admin.trips.vehicleLabel') }}
        <select id="admin-trip-vehicle" v-model="form.vehicle_id">
          <option value="">{{ t('admin.common.pickOption') }}</option>
          <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ t('admin.trips.vehicleOption', { matricule: v.matricule, seats: v.seats }) }}</option>
        </select>
      </label>
      <label for="admin-trip-departure">
        {{ t('admin.common.departure') }}
        <input id="admin-trip-departure" v-model="form.departure_at" type="datetime-local" required />
      </label>
      <label for="admin-trip-capacity">
        {{ t('admin.common.capacity') }}
        <input id="admin-trip-capacity" v-model="form.capacity" type="number" min="1" required />
      </label>
      <label for="admin-trip-seat-price">
        {{ t('admin.common.fallbackPrice') }}
        <input id="admin-trip-seat-price" v-model="form.seat_price" type="number" min="0" step="0.01" />
      </label>
      <button class="btn primary">{{ t('admin.common.createTrip') }}</button>
    </form>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.code') }}</th>
            <th>{{ t('admin.common.trajectory') }}</th>
            <th>{{ t('admin.common.departure') }}</th>
            <th>{{ t('admin.common.seats') }}</th>
            <th>{{ t('admin.trips.seatsCol') }}</th>
            <th>{{ t('admin.common.status') }}</th>
            <th>{{ t('admin.common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tr in trips" :key="tr.id">
            <td>{{ tr.code }}</td>
            <td>{{ tr.trajectory_name }}</td>
            <td>{{ fmtDateTime(tr.departure_at) }}</td>
            <td>{{ tr.seats_available ?? '—' }}/{{ tr.capacity }}</td>
            <td>{{ String(tr.nb_active_reservations) }}</td>
            <td>
              <span :class="`chip ${tr.status}`">{{ t(`status.trip.${tr.status}`) }}</span>
              <span v-if="!tr.published_at" class="chip draft">{{ t('admin.trips.notPublished') }}</span>
            </td>
            <td class="actions">
              <button class="btn ghost small" @click="void act(tr.id, 'stops')">{{ t('admin.trips.stops') }}</button>
              <button v-if="!tr.published_at" class="btn primary small" @click="void act(tr.id, 'publish')">{{ t('admin.trips.publish') }}</button>
              <button class="btn ghost small" @click="void act(tr.id, 'prices/populate')">{{ t('admin.trips.defaultPriceAction') }}</button>
              <button v-if="tr.status === 'scheduled' && tr.published_at" class="btn primary small" @click="void act(tr.id, 'start')">{{ t('admin.trips.start') }}</button>
              <button v-if="tr.status === 'in_progress'" class="btn primary small" @click="void act(tr.id, 'close')">{{ t('admin.trips.close') }}</button>
              <button v-if="tr.status === 'scheduled' || tr.status === 'in_progress'" class="btn danger small" @click="void act(tr.id, 'cancel')">{{ t('admin.trips.cancel') }}</button>
              <button v-if="tr.status === 'scheduled'" class="btn danger small" @click="void reportDriverNoShow(tr.id)">{{ t('admin.trips.driverNoShow') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
