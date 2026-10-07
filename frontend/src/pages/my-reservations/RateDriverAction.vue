<script setup lang="ts">
/** Task 6.3 — customer rates the driver once the reservation is completed. */
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
  api<{ rating_status: RatingStatus }>(`/api/reservations/${props.reservationId}/rating-status`)
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
    await api(`/api/reservations/${props.reservationId}/rate-driver`, { method: 'POST', body: { stars: stars.value, review: review.value || undefined } });
    status.value = { driver_to_customer: status.value?.driver_to_customer ?? false, customer_to_driver: true };
    open.value = false;
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <span v-if="status?.customer_to_driver" class="chip confirmed">{{ t('reservations.driverRated') }}</span>
  <span v-else>
    <button class="btn ghost small" @click="open = !open">{{ t('reservations.rateDriver') }}</button>
    <form v-if="open" class="form-inline" style="margin-top: 6px" @submit="void submit($event)">
      <span v-if="msg" class="alert error small" role="alert">{{ msg }}</span>
      <label class="sr-only" for="rate-driver-stars">{{ t('reservations.rateDriver') }}</label>
      <select id="rate-driver-stars" v-model.number="stars">
        <option v-for="n in [5, 4, 3, 2, 1]" :key="n" :value="n">{{ '★'.repeat(n) }}</option>
      </select>
      <label class="sr-only" for="rate-driver-review">{{ t('reservations.reviewPlaceholder') }}</label>
      <input id="rate-driver-review" v-model="review" :placeholder="t('reservations.reviewPlaceholder')" />
      <button class="btn primary small" :disabled="busy">{{ t('reservations.send') }}</button>
    </form>
  </span>
</template>
