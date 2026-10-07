<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { RatingRow } from '../../types';

const { t } = useI18n();
const rows = ref<RatingRow[]>([]);
const msg = ref('');

onMounted(() => {
  api<{ ratings: RatingRow[] }>('/api/driver/ratings')
    .then((r) => {
      rows.value = r.ratings;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
});
</script>

<template>
  <div>
    <p class="muted">{{ t('driver.ratings.intro') }}</p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('driver.ratings.reservation') }}</th>
            <th>{{ t('driver.ratings.customer') }}</th>
            <th>{{ t('driver.ratings.rating') }}</th>
            <th>{{ t('driver.ratings.review') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.reservation_code }}</td>
            <td>{{ r.rater_customer_name ?? '—' }}</td>
            <td>{{ '★'.repeat(r.stars) }}</td>
            <td class="muted small">{{ r.review ?? '—' }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="4" class="empty">{{ t('driver.ratings.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
