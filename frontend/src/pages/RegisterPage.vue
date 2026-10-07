<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../api';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();
const router = useRouter();
const form = reactive({ full_name: '', email: '', phone: '', password: '', referral_code: '' });
const busy = ref(false);
const error = ref('');

async function submit(e: Event): Promise<void> {
  e.preventDefault();
  error.value = '';
  busy.value = true;
  try {
    // Task 9.4 — referral_code is optional; omit entirely rather than send
    // an empty string so the server's nullish check isn't tripped by "".
    const { referral_code, ...rest } = form;
    await api('/api/auth/register', {
      method: 'POST',
      body: referral_code.trim() ? { ...rest, referral_code: referral_code.trim() } : rest,
    });
    void router.push('/login');
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="narrow">
    <h1>{{ t('register.title') }}</h1>
    <form class="card" @submit="void submit($event)">
      <label for="register-name">
        {{ t('register.fullName') }}
        <input id="register-name" v-model="form.full_name" required minlength="2" autocomplete="name" />
      </label>
      <label for="register-email">
        {{ t('register.email') }}
        <input id="register-email" v-model="form.email" type="email" required autocomplete="email" />
      </label>
      <label for="register-phone">
        {{ t('register.phone') }}
        <input
          id="register-phone"
          v-model="form.phone"
          required
          pattern="^\+?[0-9]{8,15}$"
          :placeholder="t('register.phonePlaceholder')"
          autocomplete="tel"
        />
      </label>
      <label for="register-password">
        {{ t('register.password') }}
        <input id="register-password" v-model="form.password" type="password" required minlength="8" autocomplete="new-password" />
      </label>
      <label for="register-referral">
        {{ t('register.referralCode') }}
        <input id="register-referral" v-model="form.referral_code" :placeholder="t('register.referralPlaceholder')" />
      </label>
      <button class="btn primary wide" :disabled="busy">{{ busy ? t('register.creating') : t('register.submit') }}</button>
      <p class="muted center">
        {{ t('register.alreadyRegistered') }} <router-link to="/login">{{ t('register.login') }}</router-link>
      </p>
    </form>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p>
  </section>
</template>
