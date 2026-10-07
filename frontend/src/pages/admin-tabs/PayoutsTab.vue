<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { DriverEarningsSummary, DriverRow, PayoutBatchRow, PayoutLedgerRow } from '../../types';

const { t } = useI18n();
const drivers = ref<DriverRow[]>([]);
const driverId = ref('');
const summary = ref<DriverEarningsSummary | null>(null);
const ledger = ref<PayoutLedgerRow[]>([]);
const batches = ref<PayoutBatchRow[]>([]);
const batchForm = ref({ period_start: '', period_end: '' });
const msg = ref('');

onMounted(() => {
  api<{ drivers: DriverRow[] }>('/api/admin/drivers')
    .then((d) => {
      drivers.value = d.drivers;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
});

async function loadDriver(id: string): Promise<void> {
  if (!id) {
    summary.value = null;
    ledger.value = [];
    batches.value = [];
    return;
  }
  const [s, l, b] = await Promise.all([
    api<{ summary: DriverEarningsSummary }>(`/api/admin/drivers/${id}/earnings`),
    api<{ ledger: PayoutLedgerRow[] }>(`/api/admin/drivers/${id}/earnings/ledger`),
    api<{ batches: PayoutBatchRow[] }>(`/api/admin/payout-batches?driver_id=${id}`),
  ]);
  summary.value = s.summary;
  ledger.value = l.ledger;
  batches.value = b.batches;
}

watch(driverId, (id) => {
  loadDriver(id).catch((e) => {
    msg.value = e instanceof Error ? e.message : String(e);
  });
});

async function createBatch(e: Event): Promise<void> {
  e.preventDefault();
  if (!driverId.value) return;
  msg.value = '';
  try {
    await api('/api/admin/payout-batches', {
      method: 'POST',
      body: { driver_id: driverId.value, period_start: batchForm.value.period_start, period_end: batchForm.value.period_end },
    });
    msg.value = t('admin.payouts.batchCreated');
    await loadDriver(driverId.value);
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function markPaid(batchId: string): Promise<void> {
  const reference = window.prompt(t('admin.payouts.referencePrompt'));
  if (!reference) return;
  msg.value = '';
  try {
    await api(`/api/admin/payout-batches/${batchId}/mark-paid`, { method: 'POST', body: { reference } });
    msg.value = t('admin.payouts.markedPaid');
    await loadDriver(driverId.value);
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

function summaryCards(s: DriverEarningsSummary): Array<[string, string, boolean]> {
  return [
    [t('admin.payouts.grossRevenue'), s.gross_revenue, true],
    [t('admin.payouts.commission'), s.commission, false],
    [t('admin.payouts.refunds'), s.refunds, false],
    [t('admin.payouts.netEarnings'), s.net_earnings, true],
    [t('admin.payouts.pendingPayout'), s.pending_payout, true],
    [t('admin.payouts.paidOut'), s.paid_out, true],
  ];
}
</script>

<template>
  <div>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <label for="admin-payout-driver">
      {{ t('admin.common.driver') }}
      <select id="admin-payout-driver" v-model="driverId">
        <option value="">{{ t('admin.payouts.pickDriver') }}</option>
        <option v-for="d in drivers" :key="d.id" :value="d.id">{{ t('admin.payouts.driverOption', { name: d.full_name, phone: d.phone }) }}</option>
      </select>
    </label>

    <template v-if="driverId && summary">
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0">
        <div v-for="[label, value, positive] in summaryCards(summary)" :key="label" class="card" style="min-width: 150px">
          <p class="muted small" style="margin: 0">{{ label }}</p>
          <p :class="positive ? 'positive' : 'negative'" style="font-size: 1.3rem; font-weight: 700; margin: 0">{{ Number(value).toLocaleString('fr-DZ') }} DZD</p>
        </div>
      </div>

      <form class="form-inline" @submit="void createBatch($event)">
        <label for="admin-payout-period-start">
          {{ t('admin.payouts.periodStart') }}
          <input id="admin-payout-period-start" v-model="batchForm.period_start" type="datetime-local" required />
        </label>
        <label for="admin-payout-period-end">
          {{ t('admin.payouts.periodEnd') }}
          <input id="admin-payout-period-end" v-model="batchForm.period_end" type="datetime-local" required />
        </label>
        <button class="btn primary small">{{ t('admin.payouts.createBatch') }}</button>
      </form>

      <h3>{{ t('admin.payouts.batchesTitle') }}</h3>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('admin.payouts.period') }}</th>
              <th>{{ t('admin.common.amount') }}</th>
              <th>{{ t('admin.common.status') }}</th>
              <th>{{ t('admin.common.reference') }}</th>
              <th>{{ t('admin.common.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in batches" :key="b.id">
              <td>{{ fmtDateTime(b.period_start) }} → {{ fmtDateTime(b.period_end) }}</td>
              <td>{{ Number(b.total_amount).toLocaleString('fr-DZ') }} DZD</td>
              <td><span :class="`chip ${b.status}`">{{ b.status }}</span></td>
              <td>{{ b.reference ?? '—' }}</td>
              <td class="actions">
                <button v-if="b.status === 'pending'" class="btn primary small" @click="void markPaid(b.id)">{{ t('admin.payouts.markPaid') }}</button>
              </td>
            </tr>
            <tr v-if="batches.length === 0">
              <td colspan="5" class="empty">{{ t('admin.payouts.noBatches') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>{{ t('admin.payouts.ledgerTitle') }}</h3>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>{{ t('admin.common.type') }}</th>
              <th>{{ t('admin.reservations.trip') }}</th>
              <th>{{ t('admin.payments.reservation') }}</th>
              <th>{{ t('admin.payouts.netEarnings') }}</th>
              <th>Batch</th>
              <th>{{ t('admin.common.date') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in ledger" :key="l.id">
              <td>{{ l.entry_type === 'earning' ? t('admin.payouts.entryTypeEarning') : t('admin.payouts.entryTypeAdjustment') }}</td>
              <td>{{ l.trip_code ?? '—' }}</td>
              <td>{{ l.reservation_code ?? '—' }}</td>
              <td :class="Number(l.net_amount) < 0 ? 'negative' : 'positive'">{{ Number(l.net_amount).toLocaleString('fr-DZ') }} DZD</td>
              <td>{{ l.payout_batch_id ? t('admin.payouts.assigned') : '—' }}</td>
              <td>{{ fmtDateTime(l.created_at) }}</td>
            </tr>
            <tr v-if="ledger.length === 0">
              <td colspan="6" class="empty">{{ t('admin.payouts.none') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
