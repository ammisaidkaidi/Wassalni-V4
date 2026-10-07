<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { DriverRow, TrackingRow, VehicleRow } from '../../types';

const { t } = useI18n();
const rows = ref<TrackingRow[]>([]);
const drivers = ref<DriverRow[]>([]);
const vehicles = ref<VehicleRow[]>([]);
const form = ref({ kind: 'driver' as 'driver' | 'vehicle', target_id: '', gps_lat: '', gps_lon: '' });
const msg = ref('');

async function load(): Promise<void> {
  const [tr, d, v] = await Promise.all([
    api<{ tracking: TrackingRow[] }>('/api/admin/tracking'),
    api<{ drivers: DriverRow[] }>('/api/admin/drivers'),
    api<{ vehicles: VehicleRow[] }>('/api/admin/vehicles'),
  ]);
  rows.value = tr.tracking;
  drivers.value = d.drivers;
  vehicles.value = v.vehicles;
}

onMounted(() => {
  load().catch((e) => {
    msg.value = e instanceof Error ? e.message : String(e);
  });
});

async function push(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    const path = form.value.kind === 'driver' ? `/api/admin/drivers/${form.value.target_id}/location` : `/api/admin/vehicles/${form.value.target_id}/location`;
    await api(path, { method: 'POST', body: { gps_lat: Number(form.value.gps_lat), gps_lon: Number(form.value.gps_lon) } });
    msg.value = t('admin.tracking.updated');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

function onKindChange(e: Event): void {
  form.value.kind = (e.target as HTMLSelectElement).value as 'driver' | 'vehicle';
  form.value.target_id = '';
}

const targets = computed<Array<{ id: string; label: string }>>(() =>
  form.value.kind === 'driver'
    ? drivers.value.map((d) => ({ id: d.id, label: d.full_name }))
    : vehicles.value.map((v) => ({ id: v.id, label: v.matricule })),
);
</script>

<template>
  <div>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <form class="card form-grid" @submit="void push($event)">
      <label for="admin-tracking-kind">
        {{ t('admin.tracking.targetType') }}
        <select id="admin-tracking-kind" :value="form.kind" @change="onKindChange">
          <option value="driver">{{ t('admin.tracking.targetDriver') }}</option>
          <option value="vehicle">{{ t('admin.tracking.targetVehicle') }}</option>
        </select>
      </label>
      <label for="admin-tracking-target">
        {{ t('admin.tracking.target') }}
        <select id="admin-tracking-target" v-model="form.target_id" required>
          <option value="">{{ t('admin.common.pickOption') }}</option>
          <option v-for="x in targets" :key="x.id" :value="x.id">{{ x.label }}</option>
        </select>
      </label>
      <label for="admin-tracking-lat">
        {{ t('admin.tracking.latitude') }}
        <input id="admin-tracking-lat" v-model="form.gps_lat" type="number" step="0.000001" min="-90" max="90" required />
      </label>
      <label for="admin-tracking-lon">
        {{ t('admin.tracking.longitude') }}
        <input id="admin-tracking-lon" v-model="form.gps_lon" type="number" step="0.000001" min="-180" max="180" required />
      </label>
      <button class="btn primary">{{ t('admin.tracking.updatePosition') }}</button>
    </form>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.type') }}</th>
            <th>{{ t('admin.common.name') }}</th>
            <th>{{ t('admin.tracking.latitude') }}</th>
            <th>{{ t('admin.tracking.longitude') }}</th>
            <th>{{ t('admin.tracking.recordedAt') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in rows" :key="i">
            <td>{{ r.kind === 'driver' ? t('admin.tracking.targetDriver') : t('admin.tracking.targetVehicle') }}</td>
            <td>{{ r.kind === 'driver' ? r.driver_name : r.vehicle_matricule }}</td>
            <td>{{ r.gps_lat }}</td>
            <td>{{ r.gps_lon }}</td>
            <td>{{ r.recorded_at ? fmtDateTime(r.recorded_at) : '—' }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="5" class="empty">{{ t('admin.tracking.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
