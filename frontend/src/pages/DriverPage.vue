<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useI18n } from '../composables/useI18n';
import SosButton from '../components/SosButton.vue';
import MesVoyagesTab from './driver/MesVoyagesTab.vue';
import TrajetEnCoursTab from './driver/TrajetEnCoursTab.vue';
import ReservationsTab from './driver/ReservationsTab.vue';
import TrajectoiresTab from './driver/TrajectoiresTab.vue';
import KycTab from './driver/KycTab.vue';
import VehicleInspectionsTab from './driver/VehicleInspectionsTab.vue';
import DriverRatingsTab from './driver/DriverRatingsTab.vue';
import EarningsTab from './driver/EarningsTab.vue';
import ParametresTab from './driver/ParametresTab.vue';

type Tab = 'trips' | 'current' | 'reservations' | 'trajectories' | 'kyc' | 'vehicle-inspections' | 'ratings' | 'earnings' | 'settings';

const { t } = useI18n();
const { user, loading } = useAuth();
const tab = ref<Tab>('trips');

const TABS = computed<Array<{ id: Tab; label: string }>>(() => [
  { id: 'trips', label: t('driver.tabs.trips') },
  { id: 'current', label: t('driver.tabs.current') },
  { id: 'reservations', label: t('driver.tabs.reservations') },
  { id: 'trajectories', label: t('driver.tabs.trajectories') },
  { id: 'kyc', label: t('driver.tabs.kyc') },
  { id: 'vehicle-inspections', label: t('driver.tabs.vehicleInspections') },
  { id: 'ratings', label: t('driver.tabs.ratings') },
  { id: 'earnings', label: t('driver.tabs.earnings') },
  { id: 'settings', label: t('driver.tabs.settings') },
]);
</script>

<template>
  <p v-if="loading" class="empty">{{ t('driver.loading') }}</p>
  <p v-else-if="!user" class="empty">
    <router-link to="/login?next=/driver">{{ t('driver.loginLink') }}</router-link> {{ t('driver.loginRequired') }}
  </p>
  <p v-else-if="user.role !== 'driver'" class="empty">{{ t('driver.forbidden') }}</p>
  <section v-else>
    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px">
      <h1>{{ t('driver.title') }}</h1>
      <SosButton role="driver" />
    </div>
    <div class="tabs">
      <button v-for="tb in TABS" :key="tb.id" :class="`tab${tab === tb.id ? ' active' : ''}`" @click="tab = tb.id">{{ tb.label }}</button>
    </div>
    <MesVoyagesTab v-if="tab === 'trips'" />
    <TrajetEnCoursTab v-if="tab === 'current'" />
    <ReservationsTab v-if="tab === 'reservations'" />
    <TrajectoiresTab v-if="tab === 'trajectories'" />
    <KycTab v-if="tab === 'kyc'" />
    <VehicleInspectionsTab v-if="tab === 'vehicle-inspections'" />
    <DriverRatingsTab v-if="tab === 'ratings'" />
    <EarningsTab v-if="tab === 'earnings'" />
    <ParametresTab v-if="tab === 'settings'" />
  </section>
</template>
