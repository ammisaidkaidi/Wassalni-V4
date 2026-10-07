<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { api, fileUrl } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { MaintenanceStatus, VehicleInspectionRow, VehicleRow } from '../../types';

const { t } = useI18n();
const MAINTENANCE_LABEL = computed<Record<MaintenanceStatus, string>>(() => ({
  ok: t('driver.maintenance.ok'),
  needs_service: t('driver.maintenance.needs_service'),
  out_of_service: t('driver.maintenance.out_of_service'),
}));
const rows = ref<VehicleInspectionRow[]>([]);
const vehicles = ref<VehicleRow[]>([]);
const statusFilter = ref<'' | VehicleInspectionRow['approval_state']>('pending');
const msg = ref('');
const busyId = ref<string | null>(null);
const form = ref({ vehicle_id: '', inspection_date: '', expiry_date: '', maintenance_status: 'ok' as MaintenanceStatus, notes: '' });

async function load(status: '' | VehicleInspectionRow['approval_state']): Promise<void> {
  try {
    const qs = status ? `?status=${status}` : '';
    const [insp, veh] = await Promise.all([
      api<{ inspections: VehicleInspectionRow[] }>(`/api/admin/vehicle-inspections${qs}`),
      api<{ vehicles: VehicleRow[] }>('/api/admin/vehicles'),
    ]);
    rows.value = insp.inspections;
    vehicles.value = veh.vehicles;
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

watch(statusFilter, (s) => void load(s), { immediate: true });

async function create(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api('/api/admin/vehicle-inspections', {
      method: 'POST',
      body: { ...form.value, notes: form.value.notes || undefined },
    });
    form.value = { vehicle_id: '', inspection_date: '', expiry_date: '', maintenance_status: 'ok', notes: '' };
    msg.value = t('admin.inspections.recorded');
    await load(statusFilter.value);
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function approve(id: string): Promise<void> {
  busyId.value = id;
  msg.value = '';
  try {
    await api(`/api/admin/vehicle-inspections/${id}/approve`, { method: 'POST', body: {} });
    msg.value = t('admin.inspections.approved');
    await load(statusFilter.value);
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busyId.value = null;
  }
}

async function reject(id: string): Promise<void> {
  const reason = window.prompt(t('admin.common.rejectReasonPrompt'), '');
  if (!reason) return;
  busyId.value = id;
  msg.value = '';
  try {
    await api(`/api/admin/vehicle-inspections/${id}/reject`, { method: 'POST', body: { reason } });
    msg.value = t('admin.inspections.rejected');
    await load(statusFilter.value);
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.inspections.intro') }}</p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <form class="card form-grid" @submit="void create($event)">
      <label for="admin-inspection-vehicle">
        {{ t('admin.inspections.vehicleLabel') }}
        <select id="admin-inspection-vehicle" v-model="form.vehicle_id" required>
          <option value="">{{ t('admin.common.pickOption') }}</option>
          <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ v.matricule }}</option>
        </select>
      </label>
      <label for="admin-inspection-date">
        {{ t('admin.common.inspectionDate') }}
        <input id="admin-inspection-date" v-model="form.inspection_date" type="date" required />
      </label>
      <label for="admin-inspection-expiry">
        {{ t('admin.common.expiryDate') }}
        <input id="admin-inspection-expiry" v-model="form.expiry_date" type="date" required />
      </label>
      <label for="admin-inspection-maintenance">
        {{ t('admin.common.maintenanceStatus') }}
        <select id="admin-inspection-maintenance" v-model="form.maintenance_status">
          <option value="ok">{{ t('driver.maintenance.ok') }}</option>
          <option value="needs_service">{{ t('driver.maintenance.needs_service') }}</option>
          <option value="out_of_service">{{ t('driver.maintenance.out_of_service') }}</option>
        </select>
      </label>
      <label for="admin-inspection-notes">
        {{ t('admin.common.notesOptional') }}
        <input id="admin-inspection-notes" v-model="form.notes" />
      </label>
      <button class="btn primary">{{ t('admin.common.save') }}</button>
    </form>
    <div style="margin: 12px 0">
      <select v-model="statusFilter" :aria-label="t('admin.common.filter')">
        <option value="pending">{{ t('admin.common.pending') }}</option>
        <option value="approved">{{ t('admin.common.approved') }}</option>
        <option value="rejected">{{ t('admin.common.rejected') }}</option>
        <option value="">{{ t('admin.common.all') }}</option>
      </select>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.inspections.vehicleLabel') }}</th>
            <th>{{ t('admin.common.inspectionDate') }}</th>
            <th>{{ t('admin.inspections.expiry') }}</th>
            <th>{{ t('admin.inspections.maintenance') }}</th>
            <th>{{ t('admin.common.file') }}</th>
            <th>{{ t('admin.common.status') }}</th>
            <th>{{ t('admin.common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.vehicle_matricule }}</td>
            <td>{{ r.inspection_date }}</td>
            <td>{{ r.expiry_date }}</td>
            <td>{{ MAINTENANCE_LABEL[r.maintenance_status] }}</td>
            <td>
              <a v-if="r.file_path" :href="fileUrl(`/api/admin/vehicle-inspections/${r.id}/file`)" target="_blank" rel="noreferrer">{{ t('admin.common.viewFile') }}</a>
              <template v-else>—</template>
            </td>
            <td>
              <span :class="`chip ${r.approval_state === 'approved' ? 'confirmed' : r.approval_state === 'rejected' ? 'cancelled' : 'pending'}`">{{ t(`status.kyc.${r.approval_state}`) }}</span>
              <div v-if="r.approval_state === 'rejected' && r.rejection_reason" class="muted small">{{ r.rejection_reason }}</div>
            </td>
            <td class="actions">
              <template v-if="r.approval_state === 'pending'">
                <button class="btn primary small" :disabled="busyId === r.id" @click="void approve(r.id)">{{ t('admin.common.approve') }}</button>
                <button class="btn danger small" :disabled="busyId === r.id" @click="void reject(r.id)">{{ t('admin.common.reject') }}</button>
              </template>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="7" class="empty">{{ t('admin.inspections.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
