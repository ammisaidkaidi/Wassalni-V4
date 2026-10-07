<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, apiUpload, fileUrl } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { MaintenanceStatus, VehicleInspectionRow } from '../../types';

const { t } = useI18n();
const inspections = ref<VehicleInspectionRow[]>([]);
const eligible = ref(false);
const form = ref({ inspection_date: '', expiry_date: '', maintenance_status: 'ok' as MaintenanceStatus, notes: '' });
const file = ref<File | null>(null);
const msg = ref('');
const busy = ref(false);

async function load(): Promise<void> {
  try {
    const r = await api<{ inspections: VehicleInspectionRow[]; eligible: boolean }>('/api/driver/vehicle/inspections');
    inspections.value = r.inspections;
    eligible.value = r.eligible;
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(load);

function onFileChange(e: Event): void {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null;
}

async function submit(e: Event): Promise<void> {
  e.preventDefault();
  busy.value = true;
  msg.value = '';
  try {
    if (file.value) {
      await apiUpload('/api/driver/vehicle/inspections', file.value, {
        inspection_date: form.value.inspection_date,
        expiry_date: form.value.expiry_date,
        maintenance_status: form.value.maintenance_status,
        notes: form.value.notes,
      });
    } else {
      await api('/api/driver/vehicle/inspections', { method: 'POST', body: { ...form.value, notes: form.value.notes || undefined } });
    }
    form.value = { inspection_date: '', expiry_date: '', maintenance_status: 'ok', notes: '' };
    file.value = null;
    msg.value = t('driver.inspections.sent');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div>
    <p class="muted">{{ t('driver.inspections.eligibilityNote') }}</p>
    <p>
      <span v-if="eligible" class="chip confirmed">{{ t('driver.inspections.eligible') }}</span>
      <span v-else class="chip cancelled">{{ t('driver.inspections.notEligible') }}</span>
    </p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <form class="card form-grid" @submit="void submit($event)">
      <label for="inspection-date">
        {{ t('driver.inspections.inspectionDate') }}
        <input id="inspection-date" v-model="form.inspection_date" type="date" required />
      </label>
      <label for="inspection-expiry">
        {{ t('driver.inspections.expiryDate') }}
        <input id="inspection-expiry" v-model="form.expiry_date" type="date" required />
      </label>
      <label for="inspection-maintenance">
        {{ t('driver.inspections.maintenanceStatus') }}
        <select id="inspection-maintenance" v-model="form.maintenance_status">
          <option value="ok">{{ t('driver.maintenance.ok') }}</option>
          <option value="needs_service">{{ t('driver.maintenance.needs_service') }}</option>
          <option value="out_of_service">{{ t('driver.maintenance.out_of_service') }}</option>
        </select>
      </label>
      <label for="inspection-notes">
        {{ t('driver.inspections.notes') }}
        <input id="inspection-notes" v-model="form.notes" />
      </label>
      <label for="inspection-file">
        {{ t('driver.inspections.fileLabel') }}
        <input id="inspection-file" type="file" accept=".pdf,image/*" @change="onFileChange" />
      </label>
      <button class="btn primary" :disabled="busy">{{ t('driver.inspections.send') }}</button>
    </form>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('driver.inspections.inspection') }}</th>
            <th>{{ t('driver.inspections.expiry') }}</th>
            <th>{{ t('driver.inspections.maintenance') }}</th>
            <th>{{ t('driver.inspections.file') }}</th>
            <th>{{ t('driver.inspections.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in inspections" :key="i.id">
            <td>{{ i.inspection_date }}</td>
            <td>{{ i.expiry_date }}</td>
            <td>{{ t(`driver.maintenance.${i.maintenance_status}`) }}</td>
            <td>
              <a v-if="i.file_path" :href="fileUrl(`/api/driver/vehicle/inspections/${i.id}/file`)" target="_blank" rel="noreferrer">{{ t('driver.inspections.viewFile') }}</a>
              <template v-else>—</template>
            </td>
            <td>
              <span :class="`chip ${i.approval_state === 'approved' ? 'confirmed' : i.approval_state === 'rejected' ? 'cancelled' : 'pending'}`">
                {{ t(`status.kyc.${i.approval_state}`) }}
              </span>
              <div v-if="i.approval_state === 'rejected' && i.rejection_reason" class="muted small">{{ i.rejection_reason }}</div>
            </td>
          </tr>
          <tr v-if="inspections.length === 0">
            <td colspan="5" class="empty">{{ t('driver.inspections.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
