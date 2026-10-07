<script setup lang="ts">
/** Task 10.5 — favorite routes/drivers management. */
import { onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { FavoriteDriverRow, FavoriteRouteRow } from '../../types';

const { t } = useI18n();
const routes = ref<FavoriteRouteRow[]>([]);
const drivers = ref<FavoriteDriverRow[]>([]);
const msg = ref('');

function load(): void {
  Promise.all([
    api<{ routes: FavoriteRouteRow[] }>('/api/customer/favorites/routes'),
    api<{ drivers: FavoriteDriverRow[] }>('/api/customer/favorites/drivers'),
  ])
    .then(([r, d]) => {
      routes.value = r.routes;
      drivers.value = d.drivers;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
}
onMounted(load);

async function removeRoute(id: string): Promise<void> {
  await api(`/api/customer/favorites/routes/${id}`, { method: 'DELETE' }).catch(() => undefined);
  load();
}
async function removeDriver(id: string): Promise<void> {
  await api(`/api/customer/favorites/drivers/${id}`, { method: 'DELETE' }).catch(() => undefined);
  load();
}
</script>

<template>
  <div class="card">
    <h2 style="margin-top: 0">{{ t('customerExtras.favoritesTitle') }}</h2>
    <p v-if="msg" style="color: var(--danger)" role="alert">{{ msg }}</p>
    <h3 style="font-size: 0.9rem">{{ t('customerExtras.favoriteRoutes') }}</h3>
    <p v-if="routes.length === 0" class="empty">{{ t('customerExtras.noFavoriteRoutes') }}</p>
    <div v-for="r in routes" :key="r.id" class="meta" style="flex-direction: row; justify-content: space-between">
      <span>{{ r.origin_label }} → {{ r.destination_label }}</span>
      <button class="btn ghost small" @click="void removeRoute(r.id)">{{ t('customerExtras.retire') }}</button>
    </div>
    <h3 style="font-size: 0.9rem; margin-top: 14px">{{ t('customerExtras.favoriteDrivers') }}</h3>
    <p v-if="drivers.length === 0" class="empty">{{ t('customerExtras.noFavoriteDrivers') }}</p>
    <div v-for="d in drivers" :key="d.id" class="meta" style="flex-direction: row; justify-content: space-between">
      <span>{{ d.driver_name }}</span>
      <button class="btn ghost small" @click="void removeDriver(d.id)">{{ t('customerExtras.retire') }}</button>
    </div>
  </div>
</template>
