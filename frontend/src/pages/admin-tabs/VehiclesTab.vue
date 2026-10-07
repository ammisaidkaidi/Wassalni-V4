<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { VehicleRow } from '../../types';

const { t } = useI18n();
const rows = ref<VehicleRow[]>([]);
const form = ref({ matricule: '', seats: '20', make: '', model: '' });
const msg = ref('');

async function load(): Promise<void> {
  rows.value = (await api<{ vehicles: VehicleRow[] }>('/api/admin/vehicles')).vehicles;
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
    await api('/api/admin/vehicles', {
      method: 'POST',
      body: { matricule: form.value.matricule, seats: Number(form.value.seats), make: form.value.make || undefined, model: form.value.model || undefined },
    });
    form.value = { matricule: '', seats: '20', make: '', model: '' };
    msg.value = t('admin.vehicles.added');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function remove(id: string): Promise<void> {
  msg.value = '';
  try {
    await api(`/api/admin/vehicles/${id}`, { method: 'DELETE' });
    msg.value = t('admin.common.deleted');
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
      <label for="admin-vehicle-matricule">
        {{ t('admin.common.matricule') }}
        <input id="admin-vehicle-matricule" v-model="form.matricule" required minlength="3" />
      </label>
      <label for="admin-vehicle-seats">
        {{ t('admin.common.seats') }}
        <input id="admin-vehicle-seats" v-model="form.seats" type="number" min="1" required />
      </label>
      <label for="admin-vehicle-make">
        {{ t('admin.common.make') }}
        <input id="admin-vehicle-make" v-model="form.make" />
      </label>
      <label for="admin-vehicle-model">
        {{ t('admin.common.model') }}
        <input id="admin-vehicle-model" v-model="form.model" />
      </label>
      <button class="btn primary">{{ t('admin.common.add') }}</button>
    </form>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.matricule') }}</th>
            <th>{{ t('admin.common.seats') }}</th>
            <th>{{ t('admin.vehicles.makeModel') }}</th>
            <th>{{ t('admin.vehicles.inspection') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in rows" :key="v.id">
            <td>{{ v.matricule }}</td>
            <td>{{ v.seats }}</td>
            <td>{{ [v.make, v.model].filter(Boolean).join(' ') || '—' }}</td>
            <td>
              <span v-if="v.is_eligible" class="chip confirmed">{{ t('admin.vehicles.eligible') }}</span>
              <span v-else class="chip cancelled" :title="t('admin.vehicles.notEligibleTitle')">{{ t('admin.vehicles.notEligible') }}</span>
            </td>
            <td>
              <button class="btn danger small" @click="void remove(v.id)">{{ t('admin.common.delete') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
