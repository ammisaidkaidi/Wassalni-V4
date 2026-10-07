<script setup lang="ts">
/** Task 10.6 — named passenger list for a multi-seat group booking. */
import { ref, watch } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { ReservationPassengerRow } from '../../types';

const props = defineProps<{ apiBase: string; seats: number }>();

const { t } = useI18n();
const open = ref(false);
const rows = ref<{ full_name: string; phone: string; fare_share: string }[]>([]);
const msg = ref('');
const saved = ref(false);

async function load(): Promise<void> {
  try {
    const r = await api<{ passengers: ReservationPassengerRow[] }>(`${props.apiBase}/passengers`);
    if (r.passengers.length > 0) {
      rows.value = r.passengers.map((p) => ({ full_name: p.full_name, phone: p.phone ?? '', fare_share: p.fare_share ?? '' }));
      saved.value = true;
    } else {
      rows.value = Array.from({ length: props.seats }, () => ({ full_name: '', phone: '', fare_share: '' }));
    }
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

watch(open, (isOpen) => {
  if (isOpen) void load();
});

async function save(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api(`${props.apiBase}/passengers`, {
      method: 'PUT',
      body: {
        passengers: rows.value.map((r) => ({
          full_name: r.full_name,
          phone: r.phone || null,
          fare_share: r.fare_share !== '' ? Number(r.fare_share) : null,
        })),
      },
    });
    saved.value = true;
    msg.value = t('reservationExtras.passengersSaved');
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <template v-if="seats >= 2">
    <button v-if="!open" class="btn ghost small" @click="open = true">
      {{ t('reservationExtras.passengersBtn') }} {{ saved ? '✔' : '' }}
    </button>
    <div v-else class="mini-card" style="width: 100%">
      <div class="notif-panel-head" style="border: none; padding: 0">
        <strong>{{ t('reservationExtras.passengersTitle', { seats }) }}</strong>
        <button class="btn ghost small" @click="open = false">{{ t('reservationExtras.close') }}</button>
      </div>
      <p v-if="msg" class="muted small" role="status">{{ msg }}</p>
      <form @submit="void save($event)">
        <div v-for="(r, i) in rows" :key="i" class="form-inline">
          <label :for="`passenger-name-${i}`">
            {{ t('reservationExtras.nameN', { n: i + 1 }) }}
            <input :id="`passenger-name-${i}`" v-model="r.full_name" required />
          </label>
          <label :for="`passenger-phone-${i}`">
            {{ t('reservationExtras.phoneOptional') }}
            <input :id="`passenger-phone-${i}`" v-model="r.phone" />
          </label>
          <label :for="`passenger-fare-${i}`">
            {{ t('reservationExtras.fareShareOptional') }}
            <input :id="`passenger-fare-${i}`" v-model="r.fare_share" type="number" />
          </label>
        </div>
        <button class="btn primary small">{{ t('reservationExtras.save') }}</button>
      </form>
    </div>
  </template>
</template>
