<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { RatingStatus } from '../../types';

const props = defineProps<{ reservationId: string }>();

const { t } = useI18n();
const status = ref<RatingStatus | null>(null);
const open = ref(false);
const stars = ref(5);
const review = ref('');
const msg = ref('');
const busy = ref(false);

onMounted(() => {
  api<{ rating_status: RatingStatus }>(`/api/driver/reservations/${props.reservationId}/rating-status`)
    .then((r) => {
      status.value = r.rating_status;
    })
    .catch(() => {
      status.value = null;
    });
});

async function submit(e: Event): Promise<void> {
  e.preventDefault();
  busy.value = true;
  msg.value = '';
  try {
    await api(`/api/driver/reservations/${props.reservationId}/rate-customer`, { method: 'POST', body: { stars: stars.value, review: review.value || undefined } });
    status.value = { customer_to_driver: status.value?.customer_to_driver ?? false, driver_to_customer: true };
    open.value = false;
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <span v-if="status?.driver_to_customer" class="chip confirmed">{{ t('driver.reservations.customerRated') }}</span>
  <span v-else>
    <button class="btn ghost small" @click="open = !open">{{ t('driver.reservations.rateCustomer') }}</button>
    <form v-if="open" class="form-inline" style="margin-top: 6px" @submit="void submit($event)">
      <span v-if="msg" class="alert error small" role="alert">{{ msg }}</span>
      <select v-model.number="stars" :aria-label="t('driver.reservations.rateCustomer')">
        <option v-for="n in [5, 4, 3, 2, 1]" :key="n" :value="n">{{ '★'.repeat(n) }}</option>
      </select>
      <input v-model="review" :placeholder="t('driver.reservations.reviewPlaceholder')" :aria-label="t('driver.reservations.reviewPlaceholder')" />
      <button class="btn primary small" :disabled="busy">{{ t('driver.reservations.send') }}</button>
    </form>
  </span>
</template>
