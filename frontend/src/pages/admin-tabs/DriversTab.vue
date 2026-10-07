<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import DriverAccountPanel from './DriverAccountPanel.vue';
import type { DriverRow } from '../../types';

const { t } = useI18n();
const rows = ref<DriverRow[]>([]);
const form = ref({ full_name: '', nin: '', phone: '' });
const msg = ref('');
const accountFor = ref<string | null>(null);

async function load(): Promise<void> {
  rows.value = (await api<{ drivers: DriverRow[] }>('/api/admin/drivers')).drivers;
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
    await api('/api/admin/drivers', { method: 'POST', body: form.value });
    form.value = { full_name: '', nin: '', phone: '' };
    msg.value = t('admin.drivers.added');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function remove(id: string): Promise<void> {
  msg.value = '';
  try {
    await api(`/api/admin/drivers/${id}`, { method: 'DELETE' });
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
      <label for="admin-driver-name">
        {{ t('admin.common.fullName') }}
        <input id="admin-driver-name" v-model="form.full_name" required />
      </label>
      <label for="admin-driver-nin">
        {{ t('admin.drivers.ninLabel') }}
        <input id="admin-driver-nin" v-model="form.nin" required pattern="\d{18}" />
      </label>
      <label for="admin-driver-phone">
        {{ t('admin.common.phone') }}
        <input id="admin-driver-phone" v-model="form.phone" required pattern="^\+?[0-9]{8,15}$" />
      </label>
      <button class="btn primary">{{ t('admin.common.add') }}</button>
    </form>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.name') }}</th>
            <th>NIN</th>
            <th>{{ t('admin.common.phone') }}</th>
            <th>{{ t('admin.drivers.rating') }}</th>
            <th>{{ t('admin.drivers.noShows') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <template v-for="d in rows" :key="d.id">
            <tr>
              <td>{{ d.full_name }}</td>
              <td>{{ d.nin }}</td>
              <td>{{ d.phone }}</td>
              <td>
                {{ d.rating_count ? `★ ${Number(d.rating_avg).toFixed(1)} (${d.rating_count})` : '—' }}
                <span v-if="d.trust_badge" class="chip confirmed" style="margin-left: 6px">{{ t('admin.drivers.trustBadge') }}</span>
              </td>
              <td>
                {{ d.no_show_count ?? 0 }}
                <span v-if="d.flagged_at" class="chip cancelled" style="margin-left: 6px">{{ t('admin.drivers.flagged') }}</span>
              </td>
              <td style="display: flex; gap: 6px">
                <button class="btn ghost small" @click="accountFor = accountFor === d.id ? null : d.id">
                  {{ accountFor === d.id ? t('admin.drivers.close') : t('admin.drivers.driverAccess') }}
                </button>
                <button class="btn danger small" @click="void remove(d.id)">{{ t('admin.common.delete') }}</button>
              </td>
            </tr>
            <tr v-if="accountFor === d.id">
              <td colspan="6">
                <DriverAccountPanel :driver-id="d.id" :default-email="d.email" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
