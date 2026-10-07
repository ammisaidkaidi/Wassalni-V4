<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { CustomerRow } from '../../types';

const { t } = useI18n();
const rows = ref<CustomerRow[]>([]);
const form = ref({ full_name: '', phone: '', email: '' });
const msg = ref('');

async function load(): Promise<void> {
  rows.value = (await api<{ customers: CustomerRow[] }>('/api/admin/customers')).customers;
}

onMounted(() => {
  load().catch((e) => {
    msg.value = e instanceof Error ? e.message : String(e);
  });
});

async function create(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api('/api/admin/customers', {
      method: 'POST',
      body: { full_name: form.value.full_name, phone: form.value.phone, email: form.value.email || undefined },
    });
    form.value = { full_name: '', phone: '', email: '' };
    msg.value = t('admin.customers.added');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <div>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <form class="card form-grid" @submit="void create($event)">
      <label for="admin-customer-name">
        {{ t('admin.common.fullName') }}
        <input id="admin-customer-name" v-model="form.full_name" required minlength="2" />
      </label>
      <label for="admin-customer-phone">
        {{ t('admin.common.phone') }}
        <input id="admin-customer-phone" v-model="form.phone" required pattern="^\+?[0-9]{8,15}$" />
      </label>
      <label for="admin-customer-email">
        {{ t('admin.common.emailOptional') }}
        <input id="admin-customer-email" v-model="form.email" type="email" />
      </label>
      <button class="btn primary">{{ t('admin.common.add') }}</button>
    </form>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.name') }}</th>
            <th>{{ t('admin.common.phone') }}</th>
            <th>{{ t('admin.common.email') }}</th>
            <th>{{ t('admin.customers.createdAt') }}</th>
            <th>{{ t('admin.drivers.rating') }}</th>
            <th>{{ t('admin.drivers.noShows') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in rows" :key="c.id">
            <td>{{ c.full_name }}</td>
            <td>{{ c.phone }}</td>
            <td>{{ c.email ?? '—' }}</td>
            <td>{{ fmtDateTime(c.created_at) }}</td>
            <td>{{ c.rating_count ? `★ ${Number(c.rating_avg).toFixed(1)} (${c.rating_count})` : '—' }}</td>
            <td>
              {{ c.no_show_count ?? 0 }}
              <span v-if="c.flagged_at" class="chip cancelled" style="margin-left: 6px">{{ t('admin.drivers.flagged') }}</span>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="6" class="empty">{{ t('admin.customers.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
