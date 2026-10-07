<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { DriverEarningsSummary, PayoutBatchRow, PayoutLedgerRow } from '../../types';

const { t } = useI18n();
const PAYOUT_ENTRY_LABEL = computed<Record<PayoutLedgerRow['entry_type'], string>>(() => ({
  earning: t('driver.earnings.earningEntry'),
  refund_adjustment: t('driver.earnings.refundAdjustmentEntry'),
}));
const summary = ref<DriverEarningsSummary | null>(null);
const ledger = ref<PayoutLedgerRow[]>([]);
const batches = ref<PayoutBatchRow[]>([]);
const msg = ref('');

onMounted(() => {
  Promise.all([
    api<{ summary: DriverEarningsSummary }>('/api/driver/earnings'),
    api<{ ledger: PayoutLedgerRow[] }>('/api/driver/earnings/ledger'),
    api<{ batches: PayoutBatchRow[] }>('/api/driver/earnings/payouts'),
  ])
    .then(([s, l, b]) => {
      summary.value = s.summary;
      ledger.value = l.ledger;
      batches.value = b.batches;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
});

function fmtAmount(value: string | number | undefined): string {
  return value === undefined ? '—' : `${Number(value).toLocaleString('fr-DZ')} DZD`;
}
</script>

<template>
  <div>
    <p class="muted">{{ t('driver.earnings.intro') }}</p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px">
      <div class="card" style="min-width: 160px">
        <p class="muted small" style="margin: 0">{{ t('driver.earnings.grossRevenue') }}</p>
        <p class="positive" style="font-size: 1.4rem; font-weight: 700; margin: 0">{{ fmtAmount(summary?.gross_revenue) }}</p>
      </div>
      <div class="card" style="min-width: 160px">
        <p class="muted small" style="margin: 0">{{ t('driver.earnings.commission') }}</p>
        <p class="negative" style="font-size: 1.4rem; font-weight: 700; margin: 0">{{ fmtAmount(summary?.commission) }}</p>
      </div>
      <div class="card" style="min-width: 160px">
        <p class="muted small" style="margin: 0">{{ t('driver.earnings.refunds') }}</p>
        <p class="negative" style="font-size: 1.4rem; font-weight: 700; margin: 0">{{ fmtAmount(summary?.refunds) }}</p>
      </div>
      <div class="card" style="min-width: 160px">
        <p class="muted small" style="margin: 0">{{ t('driver.earnings.netEarnings') }}</p>
        <p class="positive" style="font-size: 1.4rem; font-weight: 700; margin: 0">{{ fmtAmount(summary?.net_earnings) }}</p>
      </div>
      <div class="card" style="min-width: 160px">
        <p class="muted small" style="margin: 0">{{ t('driver.earnings.pendingPayout') }}</p>
        <p class="positive" style="font-size: 1.4rem; font-weight: 700; margin: 0">{{ fmtAmount(summary?.pending_payout) }}</p>
      </div>
      <div class="card" style="min-width: 160px">
        <p class="muted small" style="margin: 0">{{ t('driver.earnings.paidOut') }}</p>
        <p class="positive" style="font-size: 1.4rem; font-weight: 700; margin: 0">{{ fmtAmount(summary?.paid_out) }}</p>
      </div>
    </div>

    <h3>{{ t('driver.earnings.batchesTitle') }}</h3>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('driver.earnings.period') }}</th>
            <th>{{ t('driver.earnings.amount') }}</th>
            <th>{{ t('driver.earnings.status') }}</th>
            <th>{{ t('driver.earnings.reference') }}</th>
            <th>{{ t('driver.earnings.paidAt') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in batches" :key="b.id">
            <td>{{ fmtDateTime(b.period_start) }} → {{ fmtDateTime(b.period_end) }}</td>
            <td>{{ Number(b.total_amount).toLocaleString('fr-DZ') }} DZD</td>
            <td><span :class="`chip ${b.status}`">{{ b.status }}</span></td>
            <td>{{ b.reference ?? '—' }}</td>
            <td>{{ b.paid_at ? fmtDateTime(b.paid_at) : '—' }}</td>
          </tr>
          <tr v-if="batches.length === 0">
            <td colspan="5" class="empty">{{ t('driver.earnings.noBatches') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3>{{ t('driver.earnings.ledgerTitle') }}</h3>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('driver.earnings.type') }}</th>
            <th>{{ t('driver.earnings.trip') }}</th>
            <th>{{ t('driver.earnings.reservation') }}</th>
            <th>{{ t('driver.earnings.gross') }}</th>
            <th>{{ t('driver.earnings.commission') }}</th>
            <th>{{ t('driver.earnings.net') }}</th>
            <th>{{ t('driver.earnings.date') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in ledger" :key="l.id">
            <td>{{ PAYOUT_ENTRY_LABEL[l.entry_type] }}</td>
            <td>{{ l.trip_code ?? '—' }}</td>
            <td>{{ l.reservation_code ?? '—' }}</td>
            <td>{{ Number(l.gross_amount).toLocaleString('fr-DZ') }} DZD</td>
            <td>{{ Number(l.commission_amount).toLocaleString('fr-DZ') }} DZD ({{ l.commission_pct }}%)</td>
            <td :class="Number(l.net_amount) < 0 ? 'negative' : 'positive'">{{ Number(l.net_amount).toLocaleString('fr-DZ') }} DZD</td>
            <td>{{ fmtDateTime(l.created_at) }}</td>
          </tr>
          <tr v-if="ledger.length === 0">
            <td colspan="7" class="empty">{{ t('driver.earnings.noLedger') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
