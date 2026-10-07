<script setup lang="ts">
import { fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { DriverTripRow } from '../../types';

defineProps<{ title: string; trips: DriverTripRow[] }>();
const emit = defineEmits<{ open: [id: string] }>();

const { t } = useI18n();
</script>

<template>
  <div v-if="trips.length > 0" class="card" style="margin-bottom: 16px">
    <h2 style="margin-top: 0">{{ title }}</h2>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('driver.trips.code') }}</th>
            <th>{{ t('driver.trips.trajectory') }}</th>
            <th>{{ t('driver.trips.departure') }}</th>
            <th>{{ t('driver.trips.vehicle') }}</th>
            <th>{{ t('driver.trips.status') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="tr in trips" :key="tr.id">
            <td>{{ tr.code }}</td>
            <td>{{ tr.trajectory_name }}</td>
            <td>{{ fmtDateTime(tr.departure_at) }}</td>
            <td>{{ tr.vehicle_matricule ?? '—' }}</td>
            <td>{{ t(`status.trip.${tr.status}`) }}</td>
            <td>
              <button class="btn ghost small" @click="emit('open', tr.id)">{{ t('driver.trips.open') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
