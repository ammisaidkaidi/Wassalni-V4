<script setup lang="ts">
import { ref, watch } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import RateCustomerAction from './RateCustomerAction.vue';
import type { DriverReservationRow } from '../../types';

const { t } = useI18n();
const rows = ref<DriverReservationRow[]>([]);
const status = ref('pending');
const msg = ref('');
const busyId = ref<string | null>(null);

async function load(s: string): Promise<void> {
  try {
    const qs = s ? `?status=${encodeURIComponent(s)}` : '';
    const r = await api<{ reservations: DriverReservationRow[] }>(`/api/driver/reservations${qs}`);
    rows.value = r.reservations;
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

watch(status, (s) => void load(s), { immediate: true });

async function act(id: string, action: 'confirm' | 'decline'): Promise<void> {
  busyId.value = id;
  msg.value = '';
  try {
    await api(`/api/driver/reservations/${id}/${action}`, { method: 'POST' });
    msg.value = action === 'confirm' ? t('driver.reservations.confirmed') : t('driver.reservations.declined');
    await load(status.value);
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <div>
    <div class="form-inline select-row">
      <label for="driver-reservations-filter">
        {{ t('driver.reservations.filter') }}
        <select id="driver-reservations-filter" v-model="status">
          <option value="pending">{{ t('driver.reservations.statusPending') }}</option>
          <option value="confirmed">{{ t('driver.reservations.statusConfirmed') }}</option>
          <option value="completed">{{ t('driver.reservations.statusCompleted') }}</option>
          <option value="cancelled">{{ t('driver.reservations.statusCancelled') }}</option>
          <option value="">{{ t('driver.reservations.statusAll') }}</option>
        </select>
      </label>
    </div>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <p v-if="rows.length === 0" class="empty">{{ t('driver.reservations.none') }}</p>
    <div v-else class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('driver.reservations.code') }}</th>
            <th>{{ t('driver.reservations.trip') }}</th>
            <th>{{ t('driver.reservations.departure') }}</th>
            <th>{{ t('driver.reservations.customer') }}</th>
            <th>{{ t('driver.reservations.phone') }}</th>
            <th>{{ t('driver.reservations.seats') }}</th>
            <th>{{ t('driver.reservations.pickupDropoff') }}</th>
            <th>{{ t('driver.reservations.price') }}</th>
            <th>{{ t('driver.reservations.status') }}</th>
            <th>{{ t('driver.reservations.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.code }}</td>
            <td>{{ r.trip_code }} — {{ r.trajectory_name }}</td>
            <td>{{ fmtDateTime(r.departure_at) }}</td>
            <td>{{ r.customer_name }}</td>
            <td>{{ r.customer_phone }}</td>
            <td>{{ r.seats }}</td>
            <td>{{ r.pickup ?? '—' }} → {{ r.dropoff ?? '—' }}</td>
            <td>{{ r.total_price }} {{ r.currency }}</td>
            <td><span :class="`chip ${r.status}`">{{ t(`status.reservation.${r.status}`) }}</span></td>
            <td class="actions">
              <template v-if="r.status === 'pending'">
                <button class="btn primary small" :disabled="busyId === r.id" @click="void act(r.id, 'confirm')">{{ t('driver.reservations.confirm') }}</button>
                <button class="btn danger small" :disabled="busyId === r.id" @click="void act(r.id, 'decline')">{{ t('driver.reservations.decline') }}</button>
              </template>
              <RateCustomerAction v-if="r.status === 'completed'" :reservation-id="r.id" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
