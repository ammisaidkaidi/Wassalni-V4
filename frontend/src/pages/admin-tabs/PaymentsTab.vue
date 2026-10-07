<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import PaymentGatewayEventsPanel from './PaymentGatewayEventsPanel.vue';
import type { AdminReservationRow, PaymentRow, RefundWorklistRow } from '../../types';

const { t } = useI18n();
const rows = ref<PaymentRow[]>([]);
const worklist = ref<RefundWorklistRow[]>([]);
const reservations = ref<AdminReservationRow[]>([]);
const form = ref({ reservation_id: '', amount: '', method: 'cash', reference: '' });
const msg = ref('');

async function load(): Promise<void> {
  const [p, wl, res] = await Promise.all([
    api<{ payments: PaymentRow[] }>('/api/admin/payments'),
    api<{ worklist: RefundWorklistRow[] }>('/api/admin/refunds-worklist'),
    api<{ reservations: AdminReservationRow[] }>('/api/admin/reservations'),
  ]);
  rows.value = p.payments;
  worklist.value = wl.worklist;
  reservations.value = res.reservations;
}

onMounted(() => {
  load().catch((e) => {
    msg.value = e instanceof Error ? e.message : String(e);
  });
});

async function record(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api('/api/admin/payments', {
      method: 'POST',
      body: {
        reservation_id: form.value.reservation_id,
        amount: Number(form.value.amount),
        method: form.value.method,
        reference: form.value.reference || undefined,
      },
    });
    msg.value = t('admin.payments.recorded');
    form.value = { reservation_id: '', amount: '', method: 'cash', reference: '' };
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function settle(id: string): Promise<void> {
  msg.value = '';
  try {
    await api(`/api/admin/payments/${id}/settle`, { method: 'POST', body: {} });
    msg.value = t('admin.payments.settled');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function refund(id: string): Promise<void> {
  msg.value = '';
  try {
    await api(`/api/admin/payments/${id}/refund`, { method: 'POST', body: {} });
    msg.value = t('admin.payments.refunded_');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function retryRefund(refundId: string): Promise<void> {
  msg.value = '';
  try {
    await api(`/api/admin/refunds/${refundId}/retry`, { method: 'POST', body: {} });
    msg.value = t('admin.payments.retried');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function failRefund(refundId: string): Promise<void> {
  const reason = window.prompt(t('admin.payments.failedReasonPrompt'), t('admin.payments.failedReasonDefault'));
  if (reason === null) return;
  msg.value = '';
  try {
    await api(`/api/admin/refunds/${refundId}/fail`, { method: 'POST', body: { reason } });
    msg.value = t('admin.payments.markedFailed');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

const pendingOrFailedCount = computed(() => worklist.value.filter((w) => w.status === 'pending' || w.status === 'failed').length);
</script>

<template>
  <div>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <form class="card form-grid" @submit="void record($event)">
      <label for="admin-payment-reservation">
        {{ t('admin.payments.reservation') }}
        <select id="admin-payment-reservation" v-model="form.reservation_id" required>
          <option value="">{{ t('admin.common.pickOption') }}</option>
          <option v-for="r in reservations.filter((r) => r.status !== 'cancelled')" :key="r.id" :value="r.id">
            {{ t('admin.payments.pickReservation', { code: r.code, name: r.customer_name, balance: Number(r.balance_due).toLocaleString('fr-DZ'), currency: r.currency }) }}
          </option>
        </select>
      </label>
      <label for="admin-payment-amount">
        {{ t('admin.payments.amountLabel') }}
        <input id="admin-payment-amount" v-model="form.amount" type="number" min="1" step="0.01" required />
      </label>
      <label for="admin-payment-method">
        {{ t('admin.payments.method') }}
        <select id="admin-payment-method" v-model="form.method">
          <option value="cash">{{ t('admin.payments.methodCash') }}</option>
          <option value="cib">{{ t('admin.payments.methodCib') }}</option>
          <option value="edahabia">{{ t('admin.payments.methodEdahabia') }}</option>
          <option value="bank_transfer">{{ t('admin.payments.methodBankTransfer') }}</option>
          <option value="card">{{ t('admin.payments.methodCard') }}</option>
        </select>
      </label>
      <label for="admin-payment-reference">
        {{ t('admin.common.referenceOptional') }}
        <input id="admin-payment-reference" v-model="form.reference" />
      </label>
      <button class="btn primary">{{ t('admin.payments.recordPayment') }}</button>
    </form>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.code') }}</th>
            <th>{{ t('admin.payments.reservation') }}</th>
            <th>{{ t('admin.reservations.customer') }}</th>
            <th>{{ t('admin.common.amount') }}</th>
            <th>{{ t('admin.payments.refunded') }}</th>
            <th>{{ t('admin.payments.method') }}</th>
            <th>{{ t('admin.payments.origin') }}</th>
            <th>{{ t('admin.common.status') }}</th>
            <th>{{ t('admin.common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id">
            <td>{{ p.code }}</td>
            <td>{{ p.reservation_code }}</td>
            <td>{{ p.customer_name }}</td>
            <td>{{ Number(p.amount).toLocaleString('fr-DZ') }} {{ p.currency }}</td>
            <td>{{ Number(p.refunded_amount).toLocaleString('fr-DZ') }}</td>
            <td>{{ p.method }}</td>
            <td><span v-if="p.gateway" class="chip pending">{{ t('admin.payments.online', { gateway: p.gateway }) }}</span><template v-else>{{ t('admin.payments.manual') }}</template></td>
            <td>
              <span :class="`chip ${p.status}`">{{ t(`status.reservationPayment.${p.status}`) }}</span>
              <div v-if="p.status === 'failed' && p.failure_reason" class="muted small">{{ p.failure_reason }}</div>
            </td>
            <td class="actions">
              <button v-if="p.status === 'pending'" class="btn primary small" @click="void settle(p.id)">{{ t('admin.payments.settle') }}</button>
              <button v-if="p.status === 'paid' || p.status === 'partially_refunded'" class="btn ghost small" @click="void refund(p.id)">{{ t('admin.payments.refund') }}</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="9" class="empty">{{ t('admin.payments.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <PaymentGatewayEventsPanel />

    <h2>
      {{ t('admin.payments.refundRegistryTitle') }}
      <span v-if="pendingOrFailedCount > 0" class="tab-badge">{{ pendingOrFailedCount }}</span>
    </h2>
    <p class="muted small">{{ t('admin.payments.refundRegistryIntro') }}</p>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.payments.payment') }}</th>
            <th>{{ t('admin.payments.reservation') }}</th>
            <th>{{ t('admin.reservations.trip') }}</th>
            <th>{{ t('admin.reservations.customer') }}</th>
            <th>{{ t('admin.common.amount') }}</th>
            <th>{{ t('admin.payments.policy') }}</th>
            <th>{{ t('admin.payments.origin') }}</th>
            <th>{{ t('admin.common.status') }}</th>
            <th>{{ t('admin.common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="w in worklist" :key="w.refund_id">
            <td>{{ w.payment_code }}</td>
            <td>{{ w.reservation_code }}</td>
            <td>{{ w.trip_code }} — {{ fmtDateTime(w.departure_at) }}</td>
            <td>{{ w.customer_name }}<div class="muted small">{{ w.customer_phone }}</div></td>
            <td>{{ Number(w.amount).toLocaleString('fr-DZ') }} DZD</td>
            <td>{{ w.policy_pct !== null ? `${w.policy_pct}%` : '—' }}</td>
            <td>{{ w.initiated_by === 'system' ? t('admin.payments.originAutomatic') : t('admin.payments.originAdmin') }}</td>
            <td>
              <span :class="`chip ${w.status}`">{{ w.status }}</span>
              <div v-if="w.status === 'failed' && w.failure_reason" class="muted small">{{ w.failure_reason }}</div>
            </td>
            <td class="actions">
              <button v-if="w.status === 'failed'" class="btn primary small" @click="void retryRefund(w.refund_id)">{{ t('admin.payments.retry') }}</button>
              <button v-if="w.status === 'pending' || w.status === 'processing'" class="btn ghost small" @click="void failRefund(w.refund_id)">{{ t('admin.payments.markFailed') }}</button>
            </td>
          </tr>
          <tr v-if="worklist.length === 0">
            <td colspan="9" class="empty">{{ t('admin.payments.noRefunds') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
