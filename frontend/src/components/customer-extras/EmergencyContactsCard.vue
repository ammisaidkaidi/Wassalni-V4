<script setup lang="ts">
/** Task 11.5 — emergency contacts management + the SOS trigger itself. */
import { onMounted, reactive, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { EmergencyContactRow } from '../../types';
import SosButton from '../SosButton.vue';

const { t } = useI18n();
const contacts = ref<EmergencyContactRow[]>([]);
const form = reactive({ full_name: '', phone: '', relationship: '' });
const msg = ref('');

function load(): void {
  api<{ contacts: EmergencyContactRow[] }>('/api/customer/emergency-contacts')
    .then((r) => {
      contacts.value = r.contacts;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
}
onMounted(load);

async function add(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api('/api/customer/emergency-contacts', { method: 'POST', body: { ...form } });
    form.full_name = '';
    form.phone = '';
    form.relationship = '';
    load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function remove(id: string): Promise<void> {
  await api(`/api/customer/emergency-contacts/${id}`, { method: 'DELETE' }).catch(() => undefined);
  load();
}
</script>

<template>
  <div class="card">
    <h2 style="margin-top: 0">{{ t('customerExtras.emergencyTitle') }}</h2>
    <p v-if="msg" style="color: var(--danger)" role="alert">{{ msg }}</p>
    <p class="muted small">{{ t('customerExtras.sosHint') }}</p>
    <SosButton role="customer" />
    <h3 style="font-size: 0.9rem; margin-top: 16px">{{ t('customerExtras.myContacts') }}</h3>
    <p v-if="contacts.length === 0" class="empty">{{ t('customerExtras.noContacts') }}</p>
    <div
      v-for="c in contacts"
      :key="c.id"
      class="meta"
      style="flex-direction: row; justify-content: space-between; align-items: center"
    >
      <span>{{ c.full_name }} — {{ c.phone }} {{ c.relationship ? `(${c.relationship})` : '' }}</span>
      <button class="btn ghost small" @click="void remove(c.id)">{{ t('customerExtras.remove') }}</button>
    </div>
    <form class="form-inline" style="margin-top: 10px" @submit="void add($event)">
      <label for="emergency-name">
        {{ t('customerExtras.name') }}
        <input id="emergency-name" v-model="form.full_name" required />
      </label>
      <label for="emergency-phone">
        {{ t('customerExtras.phone') }}
        <input id="emergency-phone" v-model="form.phone" required />
      </label>
      <label for="emergency-relationship">
        {{ t('customerExtras.relationship') }}
        <input id="emergency-relationship" v-model="form.relationship" />
      </label>
      <button class="btn primary">{{ t('customerExtras.add') }}</button>
    </form>
  </div>
</template>
