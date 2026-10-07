<script setup lang="ts">
/** Task 9.3 (wallet) + 9.4 (referral) — customer-facing "Mon portefeuille" screen. */
import { computed, ref, watch } from 'vue';
import { api, fmtDateTime } from '../api';
import { useAuth } from '../composables/useAuth';
import { useI18n } from '../composables/useI18n';
import type { ReferralRewardRow, ReferralSummary, WalletEntryRow, WalletEntryType } from '../types';

const { t, lang } = useI18n();
const { user, loading } = useAuth();
const balance = ref<string | null>(null);
const history = ref<WalletEntryRow[]>([]);
const referral = ref<(ReferralSummary & { rewards: ReferralRewardRow[] }) | null>(null);
const error = ref('');
const copied = ref(false);

const locale = computed(() => (lang.value === 'ar' ? 'ar-DZ' : 'fr-DZ'));
const entryLabel = computed<Record<WalletEntryType, string>>(() => ({
  refund_credit: t('walletEntry.refund_credit'),
  promo_credit: t('walletEntry.promo_credit'),
  referral_credit: t('walletEntry.referral_credit'),
  booking_debit: t('walletEntry.booking_debit'),
  admin_adjustment: t('walletEntry.admin_adjustment'),
}));

async function load(): Promise<void> {
  try {
    const [w, r] = await Promise.all([
      api<{ balance: string; history: WalletEntryRow[] }>('/api/customer/wallet'),
      api<ReferralSummary & { rewards: ReferralRewardRow[] }>('/api/customer/referral'),
    ]);
    balance.value = w.balance;
    history.value = w.history;
    referral.value = r;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

watch(
  [loading, user],
  ([isLoading, u]) => {
    if (!isLoading && u) void load();
  },
  { immediate: true },
);

async function copyCode(): Promise<void> {
  if (!referral.value) return;
  try {
    await navigator.clipboard.writeText(referral.value.referral_code);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // clipboard unavailable — the code is still shown on screen, nothing to do.
  }
}
</script>

<template>
  <p v-if="loading" class="empty">{{ t('wallet.loading') }}</p>
  <p v-else-if="!user?.customer_id" class="empty">
    <router-link to="/login?next=/wallet">{{ t('login.title') }}</router-link> — {{ t('wallet.loginToView') }}
  </p>
  <section v-else>
    <h1>{{ t('wallet.title') }}</h1>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p>

    <div class="card">
      <h2 style="margin-top: 0">{{ t('wallet.balanceCard') }}</h2>
      <p style="font-size: 1.8rem; font-weight: 700; margin: 0">
        {{ balance === null ? '—' : `${Number(balance).toLocaleString(locale)} DZD` }}
      </p>
      <p class="muted small">{{ t('wallet.balanceHint') }}</p>
    </div>

    <div v-if="referral" class="card">
      <h2 style="margin-top: 0">{{ t('wallet.referralCard') }}</h2>
      <p>
        {{ t('wallet.yourCode') }} <strong style="font-size: 1.2rem">{{ referral.referral_code }}</strong>
        <button class="btn ghost small" @click="void copyCode()">{{ copied ? t('wallet.copied') : t('wallet.copy') }}</button>
      </p>
      <p class="muted small">{{ t('wallet.referralHint') }}</p>
      <div class="meta">
        <span>{{ t('wallet.totalReferred', { count: referral.total_referred }) }}</span>
        <span>{{ t('wallet.totalRewarded', { amount: Number(referral.total_rewarded).toLocaleString(locale) }) }}</span>
      </div>
      <div v-if="referral.rewards.length > 0" class="table-wrap" style="margin-top: 10px">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('wallet.referredCol') }}</th>
              <th>{{ t('wallet.amountCol') }}</th>
              <th>{{ t('wallet.statusCol') }}</th>
              <th>{{ t('wallet.dateCol') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rw in referral.rewards" :key="rw.id">
              <td>{{ rw.referred_name ?? t('wallet.notAvailable') }}</td>
              <td>{{ Number(rw.reward_amount).toLocaleString(locale) }} DZD</td>
              <td><span :class="`chip ${rw.status}`">{{ rw.status === 'paid' ? t('wallet.statusPaid') : t('wallet.statusPending') }}</span></td>
              <td>{{ fmtDateTime(rw.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-top: 0">{{ t('wallet.historyCard') }}</h2>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('wallet.typeCol') }}</th>
              <th>{{ t('wallet.amountCol') }}</th>
              <th>{{ t('wallet.descriptionCol') }}</th>
              <th>{{ t('wallet.dateCol') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in history" :key="h.id">
              <td>{{ entryLabel[h.entry_type] }}</td>
              <td :class="Number(h.amount) < 0 ? 'negative' : 'positive'">
                {{ Number(h.amount) > 0 ? '+' : '' }}{{ Number(h.amount).toLocaleString(locale) }} DZD
              </td>
              <td>{{ h.description ?? t('wallet.notAvailable') }}</td>
              <td>{{ fmtDateTime(h.created_at) }}</td>
            </tr>
            <tr v-if="history.length === 0">
              <td colspan="4" class="empty">{{ t('wallet.noMovements') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>
