<script setup lang="ts">
/** Task: admin sidebar redesign — the 25 admin tabs used to render as one
 *  flat, wrapping row of buttons (`.tabs`/`.tab`), which looked chaotic.
 *  They're now grouped into four fixed categories and rendered as a
 *  collapsible-accordion sidebar (persistent on desktop, hamburger-toggled
 *  off-canvas on narrow screens). This type/order is the single source of
 *  truth for that grouping. */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api } from '../api';
import { useAuth } from '../composables/useAuth';
import { useI18n } from '../composables/useI18n';
import TripsTab from './admin-tabs/TripsTab.vue';
import TrajectoriesTab from './admin-tabs/TrajectoriesTab.vue';
import DriversTab from './admin-tabs/DriversTab.vue';
import VehiclesTab from './admin-tabs/VehiclesTab.vue';
import CustomersTab from './admin-tabs/CustomersTab.vue';
import ReservationsTab from './admin-tabs/ReservationsTab.vue';
import PaymentsTab from './admin-tabs/PaymentsTab.vue';
import PromoCodesTab from './admin-tabs/PromoCodesTab.vue';
import PayoutsTab from './admin-tabs/PayoutsTab.vue';
import TrackingTab from './admin-tabs/TrackingTab.vue';
import NoShowTab from './admin-tabs/NoShowTab.vue';
import KycReviewTab from './admin-tabs/KycReviewTab.vue';
import VehicleInspectionReviewTab from './admin-tabs/VehicleInspectionReviewTab.vue';
import RatingsModerationTab from './admin-tabs/RatingsModerationTab.vue';
import WaitlistAdminTab from './admin-tabs/WaitlistAdminTab.vue';
import RecurringTemplatesTab from './admin-tabs/RecurringTemplatesTab.vue';
import AnalyticsTab from './admin-tabs/AnalyticsTab.vue';
import SosAdminTab from './admin-tabs/SosAdminTab.vue';
import AuditLogTab from './admin-tabs/AuditLogTab.vue';
import ImportHistoryTab from './admin-tabs/ImportHistoryTab.vue';
import AdminsTab from './admin-tabs/AdminsTab.vue';
import SettingsTab from './admin-tabs/SettingsTab.vue';
import ExportsTab from './admin-tabs/ExportsTab.vue';
import FraudSignalsTab from './admin-tabs/FraudSignalsTab.vue';
import ErrorsTab from './admin-tabs/ErrorsTab.vue';
import type { RefundWorklistRow } from '../types';

type Tab =
  | 'trips'
  | 'trajectories'
  | 'drivers'
  | 'vehicles'
  | 'customers'
  | 'reservations'
  | 'payments'
  | 'promo-codes'
  | 'payouts'
  | 'tracking'
  | 'no-show'
  | 'kyc'
  | 'vehicle-inspections'
  | 'ratings'
  | 'fraud'
  | 'errors'
  | 'waitlist'
  | 'recurring'
  | 'analytics'
  | 'audit-log'
  | 'import-history'
  | 'admins'
  | 'settings'
  | 'sos'
  | 'exports';

type Category = 'operations' | 'finance' | 'trustSafety' | 'system';

const CATEGORY_ORDER: Category[] = ['operations', 'finance', 'trustSafety', 'system'];

const TAB_CATEGORY: Record<Tab, Category> = {
  trips: 'operations',
  trajectories: 'operations',
  drivers: 'operations',
  vehicles: 'operations',
  'vehicle-inspections': 'operations',
  tracking: 'operations',
  'no-show': 'operations',
  reservations: 'operations',
  customers: 'operations',
  ratings: 'operations',
  waitlist: 'operations',
  recurring: 'operations',
  payments: 'finance',
  'promo-codes': 'finance',
  payouts: 'finance',
  kyc: 'trustSafety',
  fraud: 'trustSafety',
  errors: 'trustSafety',
  sos: 'trustSafety',
  analytics: 'system',
  'audit-log': 'system',
  'import-history': 'system',
  admins: 'system',
  settings: 'system',
  exports: 'system',
};

const { t } = useI18n();
const { user, loading } = useAuth();
const tab = ref<Tab>('trips');
// Pending-refund count shown as a badge on the "Paiements" tab, so admins
// notice outstanding refunds without having to open the tab first.
const pendingRefunds = ref(0);
// Task 11.5 — open-SOS count badge, same convenience pattern as the refund badge above.
const openSos = ref(0);
// Sidebar redesign: off-canvas open/close state (mobile hamburger) and
// which accordion category is currently expanded.
const sidebarOpen = ref(false);
const openCategory = ref<Category | null>(TAB_CATEGORY['trips']);
const sidebarRef = ref<HTMLDivElement | null>(null);

onMounted(() => {
  if (user.value?.role === 'admin') {
    api<{ worklist: RefundWorklistRow[] }>('/api/admin/refunds-worklist')
      .then((r) => {
        pendingRefunds.value = r.worklist.length;
      })
      .catch(() => {
        /* badge is a convenience — silently skip if it fails to load */
      });
    api<{ events: unknown[] }>('/api/admin/sos?status=open')
      .then((r) => {
        openSos.value = r.events.length;
      })
      .catch(() => {
        /* badge is a convenience — silently skip if it fails to load */
      });
  }
});

// Close the off-canvas sidebar when clicking outside it (mobile only —
// harmless no-op on desktop since the sidebar is always visible there).
function onDocClick(e: MouseEvent): void {
  if (sidebarOpen.value && sidebarRef.value && !sidebarRef.value.contains(e.target as Node)) {
    sidebarOpen.value = false;
  }
}
onMounted(() => document.addEventListener('mousedown', onDocClick));
onUnmounted(() => document.removeEventListener('mousedown', onDocClick));

const TABS = computed<Array<{ id: Tab; label: string }>>(() => [
  { id: 'trips', label: t('admin.tabs.trips') },
  { id: 'trajectories', label: t('admin.tabs.trajectories') },
  { id: 'drivers', label: t('admin.tabs.drivers') },
  { id: 'vehicles', label: t('admin.tabs.vehicles') },
  { id: 'customers', label: t('admin.tabs.customers') },
  { id: 'reservations', label: t('admin.tabs.reservations') },
  { id: 'payments', label: t('admin.tabs.payments') },
  { id: 'promo-codes', label: t('admin.tabs.promoCodes') },
  { id: 'payouts', label: t('admin.tabs.payouts') },
  { id: 'tracking', label: t('admin.tabs.tracking') },
  { id: 'no-show', label: t('admin.tabs.noShow') },
  { id: 'kyc', label: t('admin.tabs.kyc') },
  { id: 'vehicle-inspections', label: t('admin.tabs.vehicleInspections') },
  { id: 'ratings', label: t('admin.tabs.ratings') },
  { id: 'fraud', label: t('admin.tabs.fraud') },
  { id: 'errors', label: t('admin.tabs.errors') },
  { id: 'waitlist', label: t('admin.tabs.waitlist') },
  { id: 'recurring', label: t('admin.tabs.recurring') },
  { id: 'analytics', label: t('admin.tabs.analytics') },
  { id: 'sos', label: t('admin.tabs.sos') },
  { id: 'audit-log', label: t('admin.tabs.auditLog') },
  { id: 'import-history', label: t('admin.tabs.importHistory') },
  { id: 'admins', label: t('admin.tabs.admins') },
  { id: 'settings', label: t('admin.tabs.settings') },
  { id: 'exports', label: t('admin.tabs.exports') },
]);

const CATEGORY_LABEL = computed<Record<Category, string>>(() => ({
  operations: t('admin.categories.operations'),
  finance: t('admin.categories.finance'),
  trustSafety: t('admin.categories.trustSafety'),
  system: t('admin.categories.system'),
}));

const grouped = computed(() => {
  const byCategory = new Map<Category, Array<{ id: Tab; label: string }>>();
  for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
  for (const tb of TABS.value) byCategory.get(TAB_CATEGORY[tb.id])!.push(tb);
  return byCategory;
});

function selectTab(id: Tab): void {
  tab.value = id;
  openCategory.value = TAB_CATEGORY[id];
  sidebarOpen.value = false;
}
</script>

<template>
  <p v-if="loading" class="empty">{{ t('admin.loading') }}</p>
  <p v-else-if="user?.role !== 'admin'" class="empty">
    <router-link to="/login?next=/admin">{{ t('admin.loginLink') }}</router-link> {{ t('admin.loginRequired') }}
  </p>
  <section v-else class="admin-page">
    <div class="admin-page-head">
      <button
        type="button"
        class="admin-sidebar-toggle"
        :aria-expanded="sidebarOpen"
        aria-controls="admin-sidebar"
        :aria-label="sidebarOpen ? t('admin.sidebar.close') : t('admin.sidebar.open')"
        @click="sidebarOpen = !sidebarOpen"
      >
        {{ sidebarOpen ? '✕' : '☰' }}
      </button>
      <h1>{{ t('admin.title') }}</h1>
    </div>
    <div class="admin-shell">
      <div v-if="sidebarOpen" class="admin-sidebar-backdrop" @click="sidebarOpen = false" />
      <div id="admin-sidebar" ref="sidebarRef" :class="`admin-sidebar${sidebarOpen ? ' open' : ''}`">
        <nav :aria-label="t('admin.title')">
          <div v-for="cat in CATEGORY_ORDER" :key="cat" class="admin-nav-category">
            <button
              type="button"
              class="admin-nav-category-head"
              :aria-expanded="openCategory === cat"
              @click="openCategory = openCategory === cat ? null : cat"
            >
              <span>{{ CATEGORY_LABEL[cat] }}</span>
              <span :class="`admin-nav-chevron${openCategory === cat ? ' open' : ''}`" aria-hidden="true">▾</span>
            </button>
            <ul v-if="openCategory === cat" class="admin-nav-items">
              <li v-for="tb in grouped.get(cat) ?? []" :key="tb.id">
                <button type="button" :class="`admin-nav-item${tab === tb.id ? ' active' : ''}`" @click="selectTab(tb.id)">
                  {{ tb.label }}
                  <span v-if="tb.id === 'payments' && pendingRefunds > 0" class="tab-badge">{{ pendingRefunds }}</span>
                  <span v-if="tb.id === 'sos' && openSos > 0" class="tab-badge">{{ openSos }}</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </div>
      <div class="admin-content">
        <TripsTab v-if="tab === 'trips'" />
        <TrajectoriesTab v-if="tab === 'trajectories'" />
        <DriversTab v-if="tab === 'drivers'" />
        <VehiclesTab v-if="tab === 'vehicles'" />
        <CustomersTab v-if="tab === 'customers'" />
        <ReservationsTab v-if="tab === 'reservations'" />
        <PaymentsTab v-if="tab === 'payments'" />
        <PromoCodesTab v-if="tab === 'promo-codes'" />
        <PayoutsTab v-if="tab === 'payouts'" />
        <TrackingTab v-if="tab === 'tracking'" />
        <NoShowTab v-if="tab === 'no-show'" />
        <KycReviewTab v-if="tab === 'kyc'" />
        <VehicleInspectionReviewTab v-if="tab === 'vehicle-inspections'" />
        <RatingsModerationTab v-if="tab === 'ratings'" />
        <WaitlistAdminTab v-if="tab === 'waitlist'" />
        <RecurringTemplatesTab v-if="tab === 'recurring'" />
        <AnalyticsTab v-if="tab === 'analytics'" />
        <SosAdminTab v-if="tab === 'sos'" />
        <AuditLogTab v-if="tab === 'audit-log'" />
        <ImportHistoryTab v-if="tab === 'import-history'" />
        <AdminsTab v-if="tab === 'admins'" />
        <SettingsTab v-if="tab === 'settings'" />
        <ExportsTab v-if="tab === 'exports'" />
        <FraudSignalsTab v-if="tab === 'fraud'" />
        <ErrorsTab v-if="tab === 'errors'" />
      </div>
    </div>
  </section>
</template>
