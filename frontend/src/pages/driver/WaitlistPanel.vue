<script setup lang="ts">
/** Task 10.2 — waitlist queue for this specific trip, driver-visible (read-only). */
import { onMounted, ref, watch } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { WaitlistEntryRow } from '../../types';

const props = defineProps<{ tripId: string }>();
const { t } = useI18n();
const entries = ref<WaitlistEntryRow[]>([]);

function load(): void {
  api<{ entries: WaitlistEntryRow[] }>(`/api/driver/trips/${props.tripId}/waitlist`)
    .then((r) => {
      entries.value = r.entries;
    })
    .catch(() => {
      entries.value = [];
    });
}

onMounted(load);
watch(() => props.tripId, load);
</script>

<template>
  <template v-if="entries.length > 0">
    <h3>{{ t('driver.trips.waitlistTitle', { count: entries.length }) }}</h3>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('driver.trips.position') }}</th>
            <th>{{ t('driver.trips.customer') }}</th>
            <th>{{ t('driver.trips.seats') }}</th>
            <th>{{ t('driver.trips.status') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in entries" :key="e.id">
            <td>{{ e.position }}</td>
            <td>{{ e.customer_name ?? '—' }}</td>
            <td>{{ e.seats }}</td>
            <td>{{ t(`status.waitlist.${e.status}`) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </template>
</template>
