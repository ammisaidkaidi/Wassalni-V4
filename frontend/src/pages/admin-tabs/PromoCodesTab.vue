<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { PromoCodeRow } from '../../types';

const { t } = useI18n();
const rows = ref<PromoCodeRow[]>([]);
const form = ref({
  code: '',
  discount_type: 'fixed' as 'fixed' | 'percentage',
  discount_value: '',
  min_amount: '0',
  max_uses_total: '',
  max_uses_per_customer: '1',
  starts_at: '',
  expires_at: '',
});
const msg = ref('');

async function load(): Promise<void> {
  rows.value = (await api<{ promo_codes: PromoCodeRow[] }>('/api/admin/promo-codes')).promo_codes;
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
    await api('/api/admin/promo-codes', {
      method: 'POST',
      body: {
        code: form.value.code.trim().toUpperCase(),
        discount_type: form.value.discount_type,
        discount_value: Number(form.value.discount_value),
        min_amount: form.value.min_amount ? Number(form.value.min_amount) : undefined,
        max_uses_total: form.value.max_uses_total ? Number(form.value.max_uses_total) : null,
        max_uses_per_customer: Number(form.value.max_uses_per_customer || 1),
        starts_at: form.value.starts_at || null,
        expires_at: form.value.expires_at || null,
      },
    });
    msg.value = t('admin.promoCodes.created');
    form.value = { ...form.value, code: '', discount_value: '' };
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function toggle(id: string, active: boolean): Promise<void> {
  msg.value = '';
  try {
    await api(`/api/admin/promo-codes/${id}/${active ? 'deactivate' : 'activate'}`, { method: 'POST', body: {} });
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
      <label for="admin-promo-code">
        {{ t('admin.promoCodes.code') }}
        <input id="admin-promo-code" v-model="form.code" required minlength="3" />
      </label>
      <label for="admin-promo-type">
        {{ t('admin.promoCodes.type') }}
        <select id="admin-promo-type" v-model="form.discount_type">
          <option value="fixed">{{ t('admin.promoCodes.typeFixed') }}</option>
          <option value="percentage">{{ t('admin.promoCodes.typePercentage') }}</option>
        </select>
      </label>
      <label for="admin-promo-value">
        {{ t('admin.promoCodes.value') }}
        <input id="admin-promo-value" v-model="form.discount_value" type="number" min="0.01" step="0.01" required />
      </label>
      <label for="admin-promo-min">
        {{ t('admin.promoCodes.minAmount') }}
        <input id="admin-promo-min" v-model="form.min_amount" type="number" min="0" step="0.01" />
      </label>
      <label for="admin-promo-max-total">
        {{ t('admin.promoCodes.maxUsesTotal') }}
        <input id="admin-promo-max-total" v-model="form.max_uses_total" type="number" min="1" />
      </label>
      <label for="admin-promo-max-per-customer">
        {{ t('admin.promoCodes.maxUsesPerCustomer') }}
        <input id="admin-promo-max-per-customer" v-model="form.max_uses_per_customer" type="number" min="1" />
      </label>
      <label for="admin-promo-starts">
        {{ t('admin.promoCodes.startsAt') }}
        <input id="admin-promo-starts" v-model="form.starts_at" type="datetime-local" />
      </label>
      <label for="admin-promo-expires">
        {{ t('admin.promoCodes.expiresAt') }}
        <input id="admin-promo-expires" v-model="form.expires_at" type="datetime-local" />
      </label>
      <button class="btn primary">{{ t('admin.promoCodes.createCode') }}</button>
    </form>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.promoCodes.code') }}</th>
            <th>{{ t('admin.promoCodes.type') }}</th>
            <th>{{ t('admin.promoCodes.value') }}</th>
            <th>{{ t('admin.promoCodes.min') }}</th>
            <th>{{ t('admin.promoCodes.usages') }}</th>
            <th>{{ t('admin.promoCodes.window') }}</th>
            <th>{{ t('admin.common.status') }}</th>
            <th>{{ t('admin.common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in rows" :key="p.id">
            <td><strong>{{ p.code }}</strong></td>
            <td>{{ p.discount_type === 'fixed' ? t('admin.promoCodes.typeFixedShort') : t('admin.promoCodes.typePercentageShort') }}</td>
            <td>{{ p.discount_type === 'fixed' ? `${Number(p.discount_value).toLocaleString('fr-DZ')} DZD` : `${p.discount_value}%` }}</td>
            <td>{{ Number(p.min_amount).toLocaleString('fr-DZ') }} DZD</td>
            <td>{{ p.max_uses_total ?? '∞' }} / {{ p.max_uses_per_customer }}</td>
            <td class="muted small">{{ p.starts_at ? fmtDateTime(p.starts_at) : '—' }} → {{ p.expires_at ? fmtDateTime(p.expires_at) : '—' }}</td>
            <td><span :class="`chip ${p.active ? 'active' : 'inactive'}`">{{ p.active ? t('admin.promoCodes.active') : t('admin.promoCodes.inactive') }}</span></td>
            <td class="actions">
              <button class="btn ghost small" @click="void toggle(p.id, p.active)">{{ p.active ? t('admin.promoCodes.deactivate') : t('admin.promoCodes.activate') }}</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="8" class="empty">{{ t('admin.promoCodes.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
