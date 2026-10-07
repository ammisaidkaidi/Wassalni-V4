<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { RatingRow } from '../../types';

const { t } = useI18n();
const rows = ref<RatingRow[]>([]);
const msg = ref('');
const busyId = ref<string | null>(null);

async function load(): Promise<void> {
  try {
    rows.value = (await api<{ ratings: RatingRow[] }>('/api/admin/ratings')).ratings;
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

onMounted(load);

async function toggleHide(r: RatingRow): Promise<void> {
  busyId.value = r.id;
  msg.value = '';
  try {
    if (r.hidden_at) {
      await api(`/api/admin/ratings/${r.id}/moderate`, { method: 'POST', body: { hide: false } });
      msg.value = t('admin.ratings.shown');
    } else {
      const reason = window.prompt(t('admin.ratings.hidePrompt'), '');
      if (!reason) {
        busyId.value = null;
        return;
      }
      await api(`/api/admin/ratings/${r.id}/moderate`, { method: 'POST', body: { hide: true, reason } });
      msg.value = t('admin.ratings.hiddenMsg');
    }
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.ratings.intro') }}</p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.ratings.reservation') }}</th>
            <th>{{ t('admin.ratings.direction') }}</th>
            <th>{{ t('admin.ratings.from') }}</th>
            <th>{{ t('admin.ratings.to') }}</th>
            <th>{{ t('admin.ratings.rating') }}</th>
            <th>{{ t('admin.ratings.review') }}</th>
            <th>{{ t('admin.common.status') }}</th>
            <th>{{ t('admin.common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.reservation_code }}</td>
            <td>{{ r.direction === 'customer_to_driver' ? t('admin.ratings.directionCustomerToDriver') : t('admin.ratings.directionDriverToCustomer') }}</td>
            <td>{{ r.rater_customer_name ?? r.rater_driver_name }}</td>
            <td>{{ r.ratee_driver_name ?? r.ratee_customer_name }}</td>
            <td>{{ '★'.repeat(r.stars) }}</td>
            <td class="muted small">{{ r.review ?? '—' }}</td>
            <td>
              <span v-if="r.hidden_at" class="chip cancelled">{{ t('admin.ratings.hidden') }}</span>
              <span v-else class="chip confirmed">{{ t('admin.ratings.visible') }}</span>
              <div v-if="r.hidden_at && r.moderation_reason" class="muted small">{{ r.moderation_reason }}</div>
            </td>
            <td class="actions">
              <button class="btn ghost small" :disabled="busyId === r.id" @click="void toggleHide(r)">{{ r.hidden_at ? t('admin.ratings.show') : t('admin.ratings.hide') }}</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="8" class="empty">{{ t('admin.ratings.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
