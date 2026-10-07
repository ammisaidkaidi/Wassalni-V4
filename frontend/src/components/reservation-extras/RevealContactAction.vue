<script setup lang="ts">
/** Task 11.3 — masked contact reveal. */
import { ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';

const props = defineProps<{ apiBase: string }>();

const { t } = useI18n();
const phone = ref<string | null>(null);
const msg = ref('');
const busy = ref(false);

async function reveal(): Promise<void> {
  busy.value = true;
  msg.value = '';
  try {
    const r = await api<{ phone: string }>(`${props.apiBase}/reveal-contact`, { method: 'POST', body: {} });
    phone.value = r.phone;
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <span v-if="phone" class="pill">📞 {{ phone }}</span>
  <span v-else>
    <button class="btn ghost small" :disabled="busy" @click="void reveal()">{{ t('reservationExtras.showContact') }}</button>
    <span v-if="msg" class="muted small" role="alert"> {{ msg }}</span>
  </span>
</template>
