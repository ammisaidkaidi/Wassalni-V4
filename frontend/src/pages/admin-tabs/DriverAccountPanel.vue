<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';

interface DriverAccount {
  email: string;
  role: string;
}

const props = defineProps<{ driverId: string; defaultEmail: string | null }>();

const { t } = useI18n();
const account = ref<DriverAccount | null | undefined>(undefined); // undefined = loading
const email = ref(props.defaultEmail ?? '');
const password = ref('');
const msg = ref('');
const busy = ref(false);

async function load(): Promise<void> {
  try {
    const r = await api<{ account: DriverAccount | null }>(`/api/admin/drivers/${props.driverId}/account`);
    account.value = r.account;
    if (r.account) email.value = r.account.email;
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
    account.value = null;
  }
}

onMounted(load);

async function submit(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  busy.value = true;
  try {
    await api(`/api/admin/drivers/${props.driverId}/account`, { method: 'POST', body: { email: email.value, password: password.value } });
    password.value = '';
    msg.value = t('admin.drivers.accountSaved');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="card" style="background: var(--bg-soft, #f8fafc)">
    <p class="muted" style="margin-top: 0">
      {{
        account === undefined
          ? t('admin.drivers.accountLoading')
          : account
            ? t('admin.drivers.accountExisting', { email: account.email })
            : t('admin.drivers.accountNone')
      }}
    </p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <form class="form-grid" @submit="void submit($event)">
      <label :for="`driver-account-email-${driverId}`">
        {{ t('admin.drivers.loginEmail') }}
        <input :id="`driver-account-email-${driverId}`" v-model="email" type="email" required />
      </label>
      <label :for="`driver-account-password-${driverId}`">
        {{ t('admin.drivers.passwordLabel', { suffix: account ? t('admin.drivers.passwordNewSuffix') : '' }) }}
        <input :id="`driver-account-password-${driverId}`" v-model="password" type="password" required minlength="8" />
      </label>
      <button class="btn primary" :disabled="busy">{{ account ? t('admin.drivers.resetPassword') : t('admin.drivers.createAccess') }}</button>
    </form>
  </div>
</template>
