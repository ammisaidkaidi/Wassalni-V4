<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ApiError, api, fileUrl, fmtDateTime } from '../api';
import { useAuth } from '../composables/useAuth';
import {
  ConversationAction,
  PassengersAction,
  RequirementsAction,
  RevealContactAction,
  ShareLinkAction,
} from '../components/reservation-extras';
import { useI18n } from '../composables/useI18n';
import type { ReservationRow } from '../types';
import PayOnlineAction from './my-reservations/PayOnlineAction.vue';
import PayWithWalletAction from './my-reservations/PayWithWalletAction.vue';
import PromoCodeAction from './my-reservations/PromoCodeAction.vue';
import RateDriverAction from './my-reservations/RateDriverAction.vue';
import LiveEta from './my-reservations/LiveEta.vue';

const { t, lang } = useI18n();
const locale = computed(() => (lang.value === 'ar' ? 'ar-DZ' : 'fr-DZ'));
const { user, loading } = useAuth();
const rows = ref<ReservationRow[] | null>(null);
const error = ref('');
const msg = ref('');

async function load(): Promise<void> {
  try {
    const r = await api<{ reservations: ReservationRow[] }>('/api/reservations/me');
    rows.value = r.reservations;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) error.value = t('reservations.loginToView');
    else error.value = e instanceof Error ? e.message : String(e);
  }
}

watch(
  [loading, user],
  ([isLoading, u]) => {
    if (!isLoading && u) void load();
  },
  { immediate: true },
);

async function cancel(id: string): Promise<void> {
  msg.value = '';
  try {
    await api(`/api/reservations/${id}/cancel`, { method: 'POST', body: {} });
    msg.value = t('reservations.cancelled');
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

async function remove(id: string): Promise<void> {
  msg.value = '';
  error.value = '';
  if (!window.confirm(t('reservations.confirmRemove'))) return;
  try {
    await api(`/api/reservations/${id}`, { method: 'DELETE' });
    msg.value = t('reservations.removed');
    await load();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

const paymentLabel = computed<Record<ReservationRow['payment_status'], string>>(() => ({
  unpaid: t('status.reservationPayment.unpaid'),
  partially_paid: t('status.reservationPayment.partially_paid'),
  paid: t('status.reservationPayment.paid'),
  cancelled: t('status.reservationPayment.cancelled'),
}));

function statusLabel(key: string): string {
  const translated = t(`status.reservation.${key}`);
  return translated === `status.reservation.${key}` ? key : translated;
}
</script>

<template>
  <p v-if="loading" class="empty">{{ t('reservations.loading') }}</p>
  <p v-else-if="!user" class="empty">
    <router-link to="/login?next=/reservations">{{ t('login.title') }}</router-link> — {{ t('reservations.loginToView') }}
  </p>
  <section v-else>
    <h1>{{ t('reservations.title') }}</h1>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p>
    <p v-if="msg" class="alert success" role="status">{{ msg }}</p>
    <p v-if="rows !== null && rows.length === 0" class="empty">{{ t('reservations.none') }}</p>
    <div class="grid">
      <div v-for="r in rows ?? []" :key="r.id" class="card res-card">
        <div class="route"><strong>{{ r.trajectory_name }}</strong></div>
        <div class="meta">
          <span>🧾 {{ r.code }}</span>
          <span>🕒 {{ fmtDateTime(r.departure_at) }}</span>
          <span>👥 {{ t('reservations.seats', { count: r.seats, amount: Number(r.total_price).toLocaleString(locale), currency: r.currency }) }}</span>
        </div>
        <div class="meta">
          <span :class="`chip ${r.payment_status}`">💳 {{ paymentLabel[r.payment_status] }}</span>
          <span v-if="Number(r.amount_paid) > 0">{{ t('reservations.paid', { amount: Number(r.amount_paid).toLocaleString(locale), currency: r.currency }) }}</span>
          <span v-if="r.status !== 'cancelled' && Number(r.balance_due) > 0">{{ t('reservations.balanceDue', { amount: Number(r.balance_due).toLocaleString(locale), currency: r.currency }) }}</span>
          <PayOnlineAction v-if="r.status !== 'cancelled' && Number(r.balance_due) > 0" :reservation-id="r.id" @settled="void load()" />
          <PayWithWalletAction v-if="r.status !== 'cancelled' && Number(r.balance_due) > 0" :reservation-id="r.id" @settled="void load()" />
          <PromoCodeAction v-if="r.status !== 'cancelled' && Number(r.balance_due) > 0" :reservation-id="r.id" @settled="void load()" />
          <a v-if="Number(r.amount_paid) > 0" class="btn ghost small" :href="fileUrl(`/api/reservations/${r.id}/receipt.pdf`)" target="_blank" rel="noreferrer">
            {{ t('reservations.receiptPdf') }}
          </a>
          <span v-if="r.refund_status !== 'none'">
            {{ t(r.refund_status === 'full' ? 'reservations.refundedFull' : 'reservations.refundedPartial', { amount: Number(r.refunded_amount).toLocaleString(locale), currency: r.currency }) }}
          </span>
        </div>
        <LiveEta v-if="r.trip_status === 'in_progress' && r.status === 'confirmed'" :reservation-id="r.id" />
        <div v-if="r.status !== 'cancelled'" class="meta" style="flex-direction: row; flex-wrap: wrap; gap: 6px">
          <ConversationAction :api-base="`/api/reservations/${r.id}`" my-role="customer" />
          <RevealContactAction :api-base="`/api/reservations/${r.id}`" />
          <ShareLinkAction :api-base="`/api/reservations/${r.id}`" />
          <PassengersAction :api-base="`/api/reservations/${r.id}`" :seats="r.seats" />
          <RequirementsAction :api-base="`/api/reservations/${r.id}`" />
        </div>
        <div class="foot">
          <span :class="`chip ${r.status}`">{{ statusLabel(r.status) }}</span>
          <button v-if="r.status === 'pending' || r.status === 'confirmed'" class="btn danger small" @click="void cancel(r.id)">{{ t('reservations.cancel') }}</button>
          <button v-if="r.status === 'cancelled'" class="btn danger small" @click="void remove(r.id)">{{ t('reservations.delete') }}</button>
          <RateDriverAction v-if="r.status === 'completed'" :reservation-id="r.id" />
        </div>
      </div>
    </div>
  </section>
</template>
