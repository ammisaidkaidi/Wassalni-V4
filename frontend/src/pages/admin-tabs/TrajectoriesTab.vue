<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import WpointManager from '../../components/WpointManager.vue';
import type { TrajectoryRow, Wilaya, WpointRow } from '../../types';

const { t } = useI18n();
const rows = ref<TrajectoryRow[]>([]);
const wilayas = ref<Wilaya[]>([]);
const selected = ref('');
const wpoints = ref<WpointRow[]>([]);
const name = ref('');
const price = ref({ from: '', to: '', amount: '' });
const msg = ref('');

async function load(): Promise<void> {
  const [tr, w] = await Promise.all([
    api<{ trajectories: TrajectoryRow[] }>('/api/admin/trajectories'),
    api<{ wilayas: Wilaya[] }>('/api/registry/wilayas'),
  ]);
  rows.value = tr.trajectories;
  wilayas.value = w.wilayas;
}

onMounted(() => {
  load().catch((e) => {
    msg.value = e instanceof Error ? e.message : String(e);
  });
});

watch(selected, () => {
  price.value = { from: '', to: '', amount: '' };
});

async function create(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api('/api/admin/trajectories', { method: 'POST', body: { name: name.value } });
    name.value = '';
    msg.value = t('admin.trajectories.trajectoryCreated');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function setDefaultPrice(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api(`/api/admin/trajectories/${selected.value}/prices`, {
      method: 'POST',
      body: { from_wpoint_id: price.value.from, to_wpoint_id: price.value.to, price: Number(price.value.amount) },
    });
    msg.value = t('admin.trajectories.defaultPriceSaved');
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <div>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <form class="card form-inline" @submit="void create($event)">
      <label for="admin-new-trajectory">
        {{ t('admin.common.newTrajectory') }}
        <input id="admin-new-trajectory" v-model="name" required minlength="2" :placeholder="t('admin.trajectories.namePlaceholder')" />
      </label>
      <button class="btn primary">{{ t('admin.common.create') }}</button>
    </form>

    <div class="form-inline select-row">
      <label for="admin-trajectory-select">
        {{ t('admin.common.manage') }}
        <select id="admin-trajectory-select" v-model="selected">
          <option value="">{{ t('admin.common.pickTrajectory') }}</option>
          <option v-for="tr in rows" :key="tr.id" :value="tr.id">{{ tr.name }} ({{ t('admin.common.stopsCount', { n: tr.nb_wpoints }) }})</option>
        </select>
      </label>
    </div>

    <div v-if="selected" class="detail-grid">
      <div class="card">
        <h2>{{ t('admin.common.stopsTitle') }}</h2>
        <WpointManager base-path="/api/admin" :trajectory-id="selected" :wilayas="wilayas" @wpoints-change="(w) => (wpoints = w)" />
      </div>

      <div class="card">
        <h2>{{ t('admin.common.defaultPriceTitle') }}</h2>
        <form class="form-grid" @submit="void setDefaultPrice($event)">
          <label for="admin-price-from">
            {{ t('admin.common.from') }}
            <select id="admin-price-from" v-model="price.from" required>
              <option value="">{{ t('admin.common.pickOption') }}</option>
              <option v-for="w in wpoints" :key="w.id" :value="w.id">{{ w.nom_fr }}</option>
            </select>
          </label>
          <label for="admin-price-to">
            {{ t('admin.common.to') }}
            <select id="admin-price-to" v-model="price.to" required>
              <option value="">{{ t('admin.common.pickOption') }}</option>
              <option v-for="w in wpoints" :key="w.id" :value="w.id">{{ w.nom_fr }}</option>
            </select>
          </label>
          <label for="admin-price-amount">
            {{ t('admin.common.price') }} (DZD)
            <input id="admin-price-amount" v-model="price.amount" type="number" min="0" required />
          </label>
          <button class="btn primary">{{ t('admin.common.save') }}</button>
        </form>
      </div>
    </div>
  </div>
</template>
