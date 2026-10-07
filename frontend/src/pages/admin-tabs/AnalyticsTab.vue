<script setup lang="ts">
/** Task 12.1 — operational analytics dashboard. */
import { onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import GenericTable from './GenericTable.vue';
import type { AnalyticsSummary } from '../../types';

const { t } = useI18n();
const summary = ref<AnalyticsSummary | null>(null);
const wilayaPairs = ref<Record<string, unknown>[]>([]);
const trajectoryDemand = ref<Record<string, unknown>[]>([]);
const driverPerf = ref<Record<string, unknown>[]>([]);
const failedSearches = ref<Record<string, unknown>[]>([]);
const msg = ref('');

onMounted(() => {
  Promise.all([
    api<AnalyticsSummary>('/api/admin/analytics/summary'),
    api<{ pairs: Record<string, unknown>[] }>('/api/admin/analytics/top-wilaya-pairs'),
    api<{ trajectories: Record<string, unknown>[] }>('/api/admin/analytics/trajectory-demand'),
    api<{ drivers: Record<string, unknown>[] }>('/api/admin/analytics/driver-performance'),
    api<{ searches: Record<string, unknown>[] }>('/api/admin/analytics/failed-searches'),
  ])
    .then(([s, wp, td, dp, fs]) => {
      summary.value = s;
      wilayaPairs.value = wp.pairs;
      trajectoryDemand.value = td.trajectories;
      driverPerf.value = dp.drivers;
      failedSearches.value = fs.searches;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
});
</script>

<template>
  <div>
    <p v-if="msg" class="alert error" role="alert">{{ msg }}</p>
    <div v-if="summary" class="grid">
      <div class="card">
        <h2 style="margin-top: 0; font-size: 0.85rem; color: var(--muted)">{{ t('admin.analytics.revenue') }}</h2>
        <p style="font-size: 1.4rem; font-weight: 800">{{ Number(summary.revenue).toLocaleString('fr-DZ') }} DZD</p>
      </div>
      <div class="card">
        <h2 style="margin-top: 0; font-size: 0.85rem; color: var(--muted)">{{ t('admin.analytics.reservations') }}</h2>
        <p style="font-size: 1.4rem; font-weight: 800">{{ summary.bookings }}</p>
      </div>
      <div class="card">
        <h2 style="margin-top: 0; font-size: 0.85rem; color: var(--muted)">{{ t('admin.analytics.occupancyRate') }}</h2>
        <p style="font-size: 1.4rem; font-weight: 800">{{ (Number(summary.occupancy_pct) * 100).toFixed(0) }}%</p>
      </div>
      <div class="card">
        <h2 style="margin-top: 0; font-size: 0.85rem; color: var(--muted)">{{ t('admin.analytics.cancellationsNoShows') }}</h2>
        <p style="font-size: 1.4rem; font-weight: 800">{{ summary.cancellations }} / {{ summary.no_shows }}</p>
      </div>
      <div class="card">
        <h2 style="margin-top: 0; font-size: 0.85rem; color: var(--muted)">{{ t('admin.analytics.refunds') }}</h2>
        <p style="font-size: 1.4rem; font-weight: 800">{{ Number(summary.refunds_total).toLocaleString('fr-DZ') }} DZD</p>
      </div>
    </div>

    <GenericTable :title="t('admin.analytics.topWilayaPairs')" :rows="wilayaPairs" />
    <GenericTable :title="t('admin.analytics.trajectoryDemand')" :rows="trajectoryDemand" />
    <GenericTable :title="t('admin.analytics.driverPerformance')" :rows="driverPerf" />
    <GenericTable :title="t('admin.analytics.failedSearches')" :rows="failedSearches" />
  </div>
</template>
