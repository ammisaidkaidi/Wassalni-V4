<script setup lang="ts">
/** Task 10.7 — accessibility / service requirements for this reservation. */
import { ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';

const props = defineProps<{ apiBase: string }>();

const { t } = useI18n();
const open = ref(false);
const wheelchair = ref(false);
const pet = ref(false);
const luggage = ref('0');
const notes = ref('');
const msg = ref('');

async function save(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api(`${props.apiBase}/requirements`, {
      method: 'PUT',
      body: { needs_wheelchair: wheelchair.value, has_pet: pet.value, luggage_count: Number(luggage.value) || 0, special_requirements: notes.value || null },
    });
    msg.value = t('reservationExtras.requirementsSaved');
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <button v-if="!open" class="btn ghost small" @click="open = true">{{ t('reservationExtras.requirementsBtn') }}</button>
  <div v-else class="mini-card" style="width: 100%">
    <div class="notif-panel-head" style="border: none; padding: 0">
      <strong>{{ t('reservationExtras.requirementsTitle') }}</strong>
      <button class="btn ghost small" @click="open = false">{{ t('reservationExtras.close') }}</button>
    </div>
    <p v-if="msg" class="muted small" role="status">{{ msg }}</p>
    <form class="form-inline" @submit="void save($event)">
      <label style="flex-direction: row; align-items: center; gap: 6px">
        <input v-model="wheelchair" type="checkbox" />
        {{ t('reservationExtras.wheelchair') }}
      </label>
      <label style="flex-direction: row; align-items: center; gap: 6px">
        <input v-model="pet" type="checkbox" />
        {{ t('reservationExtras.pet') }}
      </label>
      <label for="requirements-luggage">
        {{ t('reservationExtras.luggage') }}
        <input id="requirements-luggage" v-model="luggage" type="number" min="0" />
      </label>
      <label for="requirements-notes">
        {{ t('reservationExtras.notes') }}
        <input id="requirements-notes" v-model="notes" />
      </label>
      <button class="btn primary small">{{ t('reservationExtras.save') }}</button>
    </form>
  </div>
</template>
