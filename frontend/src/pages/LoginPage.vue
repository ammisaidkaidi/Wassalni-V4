<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, setSessionToken } from '../api';
import { useAuth } from '../composables/useAuth';
import { useI18n } from '../composables/useI18n';

interface Challenge {
  otp_required: true;
  otp_token: string;
  expires_in: number;
  channel: 'email' | 'sms';
  can_use_sms: boolean;
  dev_code?: string;
}

const { t } = useI18n();
const route = useRoute();
const next = (route.query.next as string) ?? '/';
const router = useRouter();
const { refresh } = useAuth();

const step = ref<'password' | 'otp'>('password');
const email = ref('');
const password = ref('');
const code = ref('');
const challenge = ref<Challenge | null>(null);
const busy = ref(false);
const error = ref('');

async function submitPassword(e: Event): Promise<void> {
  e.preventDefault();
  error.value = '';
  busy.value = true;
  try {
    const r = await api<Challenge>('/api/auth/login', { method: 'POST', body: { email: email.value, password: password.value } });
    challenge.value = r;
    step.value = 'otp';
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

async function submitCode(e: Event): Promise<void> {
  e.preventDefault();
  error.value = '';
  busy.value = true;
  try {
    const r = await api<{ user: unknown; token: string }>('/api/auth/verify-2fa', {
      method: 'POST',
      body: { otp_token: challenge.value?.otp_token, code: code.value },
    });
    setSessionToken(r.token);
    await refresh();
    void router.push(next);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

async function resend(channel?: 'email' | 'sms'): Promise<void> {
  error.value = '';
  busy.value = true;
  try {
    if (challenge.value) {
      challenge.value = await api<Challenge>('/api/auth/resend-2fa', {
        method: 'POST',
        body: { otp_token: challenge.value.otp_token, channel },
      });
    }
    code.value = '';
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

function onCodeInput(e: Event): void {
  code.value = (e.target as HTMLInputElement).value.replace(/\D/g, '');
}
</script>

<template>
  <section class="narrow">
    <h1>{{ t('login.title') }}</h1>
    <form v-if="step === 'password'" class="card" @submit="void submitPassword($event)">
      <label for="login-email">
        {{ t('login.email') }}
        <input id="login-email" v-model="email" type="email" required :placeholder="t('login.emailPlaceholder')" autocomplete="email" />
      </label>
      <label for="login-password">
        {{ t('login.password') }}
        <input id="login-password" v-model="password" type="password" required autocomplete="current-password" />
      </label>
      <button class="btn primary wide" :disabled="busy">{{ busy ? t('login.verifying') : t('login.continueBtn') }}</button>
      <p class="muted center">
        {{ t('login.noAccount') }} <router-link to="/register">{{ t('login.createAccount') }}</router-link>
      </p>
    </form>
    <form v-else class="card" @submit="void submitCode($event)">
      <p class="muted">{{ challenge?.channel === 'sms' ? t('login.codeSentToSms') : t('login.codeSentTo', { email }) }}</p>
      <p v-if="challenge?.dev_code" class="alert info" role="status">{{ t('login.devModeCode', { code: challenge.dev_code }) }}</p>
      <label for="login-otp">
        {{ t('login.verificationCode') }}
        <input
          id="login-otp"
          :value="code"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          required
          placeholder="······"
          class="otp-input"
          autocomplete="one-time-code"
          @input="onCodeInput"
        />
      </label>
      <button class="btn primary wide" :disabled="busy || code.length !== 6">{{ busy ? t('login.verifying') : t('login.submit') }}</button>
      <button type="button" class="btn ghost wide" :disabled="busy" @click="void resend()">{{ t('login.resend') }}</button>
      <button
        v-if="challenge?.can_use_sms"
        type="button"
        class="btn ghost wide"
        :disabled="busy"
        @click="void resend(challenge!.channel === 'sms' ? 'email' : 'sms')"
      >
        {{ challenge.channel === 'sms' ? t('login.useEmailInstead') : t('login.useSmsInstead') }}
      </button>
    </form>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p>
  </section>
</template>
