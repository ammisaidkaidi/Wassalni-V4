<script setup lang="ts">
import { ref, watch } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { AdminReservationRow } from '../../types';

const { t } = useI18n();
const rows = ref<AdminReservationRow[]>([]);
const statusFilter = ref('');
const msg = ref('');

async function load(status: string): Promise<void> {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  rows.value = (await api<{ reservations: AdminReservationRow[] }>(`/api/admin/reservations${q}`)).reservations;
}

watch(
  statusFilter,
  (s) => {
    load(s).catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
  },
  { immediate: true },
);

async function act(id: string, action: 'confirm' | 'cancel'): Promise<void> {
  msg.value = '';
  try {
    await api(`/api/admin/reservations/${id}/${action}`, { method: 'POST', body: {} });
    msg.value = action === 'confirm' ? t('admin.reservations.confirmed') : t('admin.reservations.cancelled');
    await load(statusFilter.value);
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <div>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <div class="form-inline select-row">
      <label for="admin-reservations-filter">
        {{ t('admin.reservations.filterByStatus') }}
        <select id="admin-reservations-filter" v-model="statusFilter">
          <option value="">{{ t('admin.common.all') }}</option>
          <option value="pending">{{ t('admin.common.pending') }}</option>
          <option value="confirmed">{{ t('admin.reservations.statusConfirmedOpt') }}</option>
          <option value="completed">{{ t('admin.reservations.statusCompletedOpt') }}</option>
          <option value="cancelled">{{ t('admin.reservations.statusCancelledOpt') }}</option>
          <option value="no_show">{{ t('admin.reservations.statusNoShowOpt') }}</option>
        </select>
      </label>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.code') }}</th>
            <th>{{ t('admin.reservations.customer') }}</th>
            <th>{{ t('admin.reservations.trip') }}</th>
            <th>{{ t('admin.common.departure') }}</th>
            <th>{{ t('admin.common.seats') }}</th>
            <th>{{ t('admin.reservations.total') }}</th>
            <th>{{ t('admin.reservations.paid') }}</th>
            <th>{{ t('admin.reservations.balance') }}</th>
            <th>{{ t('admin.common.status') }}</th>
            <th>{{ t('admin.common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.code }}</td>
            <td>{{ r.customer_name }}<div class="muted small">{{ r.customer_phone }}</div></td>
            <td>{{ r.trip_code }}</td>
            <td>{{ fmtDateTime(r.departure_at) }}</td>
            <td>{{ r.seats }}</td>
            <td>{{ Number(r.total_price).toLocaleString('fr-DZ') }} {{ r.currency }}</td>
            <td>{{ Number(r.amount_paid).toLocaleString('fr-DZ') }}</td>
            <td>{{ Number(r.balance_due).toLocaleString('fr-DZ') }}</td>
            <td><span :class="`chip ${r.status}`">{{ t(`status.reservation.${r.status}`) }}</span></td>
            <td class="actions">
              <button v-if="r.status === 'pending'" class="btn primary small" @click="void act(r.id, 'confirm')">{{ t('admin.reservations.confirm') }}</button>
              <button v-if="r.status === 'pending' || r.status === 'confirmed'" class="btn danger small" @click="void act(r.id, 'cancel')">{{ t('admin.trips.cancel') }}</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="10" class="empty">{{ t('admin.reservations.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
