<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { api, fileUrl, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { KycDocType, KycDocumentRow } from '../../types';

const { t } = useI18n();
const KYC_DOC_LABEL = computed<Record<KycDocType, string>>(() => ({
  identity: t('status.kycDoc.identity'),
  license: t('status.kycDoc.license'),
  vehicle_registration: t('status.kycDoc.vehicle_registration'),
  insurance: t('status.kycDoc.insurance'),
}));
const docs = ref<KycDocumentRow[]>([]);
const statusFilter = ref<'' | KycDocumentRow['status']>('pending');
const msg = ref('');
const busyId = ref<string | null>(null);

async function load(status: '' | KycDocumentRow['status']): Promise<void> {
  try {
    const qs = status ? `?status=${status}` : '';
    docs.value = (await api<{ documents: KycDocumentRow[] }>(`/api/admin/kyc${qs}`)).documents;
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

watch(statusFilter, (s) => void load(s), { immediate: true });

async function approve(id: string): Promise<void> {
  busyId.value = id;
  msg.value = '';
  try {
    await api(`/api/admin/kyc/${id}/approve`, { method: 'POST', body: {} });
    msg.value = t('admin.kyc.approved');
    await load(statusFilter.value);
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busyId.value = null;
  }
}

async function reject(id: string): Promise<void> {
  const reason = window.prompt(t('admin.common.rejectReasonPrompt'), '');
  if (!reason) return;
  busyId.value = id;
  msg.value = '';
  try {
    await api(`/api/admin/kyc/${id}/reject`, { method: 'POST', body: { reason } });
    msg.value = t('admin.kyc.rejected');
    await load(statusFilter.value);
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.kyc.intro') }}</p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <div style="margin: 12px 0">
      <select v-model="statusFilter" :aria-label="t('admin.common.filter')">
        <option value="pending">{{ t('admin.common.pending') }}</option>
        <option value="approved">{{ t('admin.common.approved') }}</option>
        <option value="rejected">{{ t('admin.common.rejected') }}</option>
        <option value="">{{ t('admin.common.all') }}</option>
      </select>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.kyc.driver') }}</th>
            <th>{{ t('admin.common.type') }}</th>
            <th>{{ t('admin.kyc.sentAt') }}</th>
            <th>{{ t('admin.common.file') }}</th>
            <th>{{ t('admin.common.status') }}</th>
            <th>{{ t('admin.common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in docs" :key="d.id">
            <td>{{ d.driver_name }}</td>
            <td>{{ KYC_DOC_LABEL[d.doc_type] }}</td>
            <td>{{ fmtDateTime(d.submitted_at) }}</td>
            <td><a :href="fileUrl(`/api/admin/kyc/${d.id}/file`)" target="_blank" rel="noreferrer">{{ t('admin.common.viewFile') }}</a></td>
            <td>
              <span :class="`chip ${d.status === 'approved' ? 'confirmed' : d.status === 'rejected' ? 'cancelled' : 'pending'}`">{{ t(`status.kyc.${d.status}`) }}</span>
              <div v-if="d.status === 'rejected' && d.rejection_reason" class="muted small">{{ d.rejection_reason }}</div>
            </td>
            <td class="actions">
              <template v-if="d.status === 'pending'">
                <button class="btn primary small" :disabled="busyId === d.id" @click="void approve(d.id)">{{ t('admin.common.approve') }}</button>
                <button class="btn danger small" :disabled="busyId === d.id" @click="void reject(d.id)">{{ t('admin.common.reject') }}</button>
              </template>
            </td>
          </tr>
          <tr v-if="docs.length === 0">
            <td colspan="6" class="empty">{{ t('admin.kyc.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
