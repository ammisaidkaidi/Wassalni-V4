<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api, apiUpload, fileUrl, fmtDateTime } from '../../api';
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
const msg = ref('');
const busyType = ref<KycDocType | null>(null);

async function load(): Promise<void> {
  try {
    const r = await api<{ documents: KycDocumentRow[] }>('/api/driver/kyc');
    docs.value = r.documents;
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(load);

const latestByType = computed(() => {
  const m = new Map<KycDocType, KycDocumentRow>();
  for (const d of docs.value) {
    const existing = m.get(d.doc_type);
    if (!existing || new Date(d.submitted_at) > new Date(existing.submitted_at)) m.set(d.doc_type, d);
  }
  return m;
});

async function upload(docType: KycDocType, file: File | undefined): Promise<void> {
  if (!file) return;
  busyType.value = docType;
  msg.value = '';
  try {
    await apiUpload('/api/driver/kyc', file, { doc_type: docType });
    msg.value = t('driver.kyc.uploaded');
    await load();
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  } finally {
    busyType.value = null;
  }
}

function onFileChange(docType: KycDocType, e: Event): void {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  void upload(docType, file);
}

const docTypes = computed(() => Object.keys(KYC_DOC_LABEL.value) as KycDocType[]);
</script>

<template>
  <div>
    <p class="muted">{{ t('driver.kyc.intro') }}</p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <div class="grid">
      <div v-for="docType in docTypes" :key="docType" class="card">
        <h3 style="margin-top: 0">{{ KYC_DOC_LABEL[docType] }}</h3>
        <template v-if="latestByType.get(docType)">
          <p><span :class="`chip ${latestByType.get(docType)!.status}`">{{ t(`status.kyc.${latestByType.get(docType)!.status}`) }}</span></p>
          <p class="muted small">
            {{ t('driver.kyc.sentOn', { date: fmtDateTime(latestByType.get(docType)!.submitted_at) }) }}
            <a :href="fileUrl(`/api/driver/kyc/${latestByType.get(docType)!.id}/file`)" target="_blank" rel="noreferrer">{{ t('driver.kyc.viewFile') }}</a>
          </p>
          <p v-if="latestByType.get(docType)!.status === 'rejected' && latestByType.get(docType)!.rejection_reason" class="alert error" role="alert">
            {{ t('driver.kyc.rejectionReason', { reason: latestByType.get(docType)!.rejection_reason ?? '' }) }}
          </p>
        </template>
        <p v-else class="muted small">{{ t('driver.kyc.noneSent') }}</p>
        <label class="btn ghost small" style="display: inline-block; cursor: pointer">
          {{ busyType === docType ? t('driver.kyc.uploading') : latestByType.get(docType) ? t('driver.kyc.uploadNewVersion') : t('driver.kyc.upload') }}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            style="display: none"
            :disabled="busyType !== null"
            @change="(e) => onFileChange(docType, e)"
          />
        </label>
      </div>
    </div>
  </div>
</template>
