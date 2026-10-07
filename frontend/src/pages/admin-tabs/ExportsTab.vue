<script setup lang="ts">
/** Task 12.3 — CSV/PDF exports across the main admin data categories. */
import { computed } from 'vue';
import { fileUrl } from '../../api';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();
const categories = computed<{ id: string; label: string }[]>(() => [
  { id: 'drivers', label: t('admin.exports.categories.drivers') },
  { id: 'customers', label: t('admin.exports.categories.customers') },
  { id: 'trips', label: t('admin.exports.categories.trips') },
  { id: 'reservations', label: t('admin.exports.categories.reservations') },
  { id: 'payments', label: t('admin.exports.categories.payments') },
  { id: 'refunds', label: t('admin.exports.categories.refunds') },
  { id: 'payouts', label: t('admin.exports.categories.payouts') },
  { id: 'analytics', label: t('admin.exports.categories.analytics') },
]);
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.exports.intro') }}</p>
    <div class="grid">
      <div v-for="c in categories" :key="c.id" class="card">
        <h2 style="margin-top: 0; font-size: 0.95rem">{{ c.label }}</h2>
        <div style="display: flex; gap: 8px">
          <a class="btn ghost small" :href="fileUrl(`/api/admin/export/${c.id}.csv`)">{{ t('admin.exports.csv') }}</a>
          <a class="btn ghost small" :href="fileUrl(`/api/admin/export/${c.id}.pdf`)" target="_blank" rel="noreferrer">{{ t('admin.exports.pdf') }}</a>
        </div>
      </div>
    </div>
  </div>
</template>
