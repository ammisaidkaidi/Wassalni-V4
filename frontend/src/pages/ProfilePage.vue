<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { api, ApiError } from '../api';
import { useAuth } from '../composables/useAuth';
import { EmergencyContactsCard, FavoritesCard, WaitlistCard } from '../components/customer-extras';
import PushNotificationsCard from '../components/PushNotificationsCard.vue';
import { useI18n } from '../composables/useI18n';
import type { CommuneRow, CustomerProfileRow, Wilaya } from '../types';

interface ProfileForm {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  nin: string;
  nif: string;
  home_wilaya_id: string;
  home_commune_id: string;
  gps_lat: string;
  gps_lon: string;
}

const EMPTY_FORM: ProfileForm = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  nin: '',
  nif: '',
  home_wilaya_id: '',
  home_commune_id: '',
  gps_lat: '',
  gps_lon: '',
};

const { t, lang } = useI18n();
const { user, loading: authLoading } = useAuth();
const profile = ref<CustomerProfileRow | null>(null);
const form = reactive<ProfileForm>({ ...EMPTY_FORM });
const wilayas = ref<Wilaya[]>([]);
const communes = ref<CommuneRow[]>([]);
const msg = ref('');
const error = ref('');
const saving = ref(false);
const locating = ref(false);

async function load(): Promise<void> {
  try {
    const [p, w] = await Promise.all([
      api<{ customer: CustomerProfileRow }>('/api/customer/me'),
      api<{ wilayas: Wilaya[] }>('/api/registry/wilayas'),
    ]);
    profile.value = p.customer;
    wilayas.value = w.wilayas;
    Object.assign(form, {
      full_name: p.customer.full_name,
      phone: p.customer.phone,
      email: p.customer.email ?? '',
      address: p.customer.address ?? '',
      nin: p.customer.nin ?? '',
      nif: p.customer.nif ?? '',
      home_wilaya_id: p.customer.home_wilaya_id != null ? String(p.customer.home_wilaya_id) : '',
      home_commune_id: p.customer.home_commune_id != null ? String(p.customer.home_commune_id) : '',
      gps_lat: p.customer.gps_lat ?? '',
      gps_lon: p.customer.gps_lon ?? '',
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
}

watch(
  [authLoading, user],
  ([isLoading, u]) => {
    if (!isLoading && u) void load();
  },
  { immediate: true },
);

// Reload the commune list whenever the chosen home wilaya changes, and drop
// any previously-selected commune that no longer belongs to it.
watch(
  () => form.home_wilaya_id,
  (wilayaId) => {
    if (!wilayaId) {
      communes.value = [];
      return;
    }
    api<{ communes: CommuneRow[] }>(`/api/registry/wilayas/${wilayaId}/communes`)
      .then((r) => {
        communes.value = r.communes;
        if (form.home_commune_id && !r.communes.some((c) => String(c.id) === form.home_commune_id)) {
          form.home_commune_id = '';
        }
      })
      .catch(() => {
        communes.value = [];
      });
  },
);

const wilayaNameMap = computed(() => new Map(wilayas.value.map((w) => [w.id, w.nom_fr] as const)));
function wilayaName(id: number | null): string {
  return id != null ? wilayaNameMap.value.get(id) ?? `#${id}` : '—';
}

function useCurrentLocation(): void {
  if (!('geolocation' in navigator)) {
    error.value = t('profile.geolocationUnavailable');
    return;
  }
  locating.value = true;
  error.value = '';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      form.gps_lat = pos.coords.latitude.toFixed(6);
      form.gps_lon = pos.coords.longitude.toFixed(6);
      locating.value = false;
    },
    (err) => {
      error.value = t('profile.positionUnavailable', { error: err.message });
      locating.value = false;
    },
    { enableHighAccuracy: true, timeout: 10_000 },
  );
}

async function save(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  error.value = '';
  saving.value = true;
  try {
    const r = await api<{ customer: CustomerProfileRow }>('/api/customer/me', {
      method: 'PUT',
      body: {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        address: form.address || null,
        nin: form.nin || null,
        nif: form.nif || null,
        home_wilaya_id: form.home_wilaya_id ? Number(form.home_wilaya_id) : null,
        home_commune_id: form.home_commune_id ? Number(form.home_commune_id) : null,
        gps_lat: form.gps_lat !== '' ? Number(form.gps_lat) : null,
        gps_lon: form.gps_lon !== '' ? Number(form.gps_lon) : null,
      },
    });
    profile.value = r.customer;
    msg.value = t('profile.updated');
  } catch (e) {
    if (e instanceof ApiError) error.value = e.message;
    else error.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

function onNinInput(e: Event): void {
  form.nin = (e.target as HTMLInputElement).value.replace(/\D/g, '');
}
function onNifInput(e: Event): void {
  form.nif = (e.target as HTMLInputElement).value.replace(/\D/g, '');
}
function onWilayaChange(e: Event): void {
  form.home_wilaya_id = (e.target as HTMLSelectElement).value;
  form.home_commune_id = '';
}
</script>

<template>
  <p v-if="authLoading" class="empty">{{ t('profile.loading') }}</p>
  <p v-else-if="!user || !user.customer_id" class="empty">
    <router-link to="/login?next=/profile">{{ t('login.title') }}</router-link> — {{ t('profile.loginToManage') }}
  </p>
  <p v-else-if="!profile && error" class="alert error" role="alert">{{ error }}</p>
  <p v-else-if="!profile" class="empty">{{ t('profile.loading') }}</p>
  <section v-else>
    <h1>{{ t('profile.title') }}</h1>
    <p v-if="msg" class="alert success" role="status">{{ msg }}</p>
    <p v-if="error" class="alert error" role="alert">{{ error }}</p>

    <div class="detail-grid">
      <div class="card">
        <h2 style="margin-top: 0">{{ t('profile.identityCard') }}</h2>
        <p class="muted small">
          {{ t('profile.memberSince', {
            date: new Date(profile.created_at).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ'),
            wilaya: wilayaName(profile.home_wilaya_id),
          }) }}
        </p>
        <form class="form-grid" @submit="void save($event)">
          <label for="profile-name">
            {{ t('profile.fullName') }}
            <input id="profile-name" v-model="form.full_name" required minlength="2" />
          </label>
          <label for="profile-phone">
            {{ t('profile.phone') }}
            <input id="profile-phone" v-model="form.phone" required />
          </label>
          <label for="profile-email">
            {{ t('profile.email') }}
            <input id="profile-email" v-model="form.email" type="email" />
          </label>
          <label for="profile-address">
            {{ t('profile.address') }}
            <input id="profile-address" v-model="form.address" />
          </label>
          <label for="profile-nin">
            {{ t('profile.nin') }}
            <input id="profile-nin" :value="form.nin" maxlength="18" :placeholder="t('profile.optional')" @input="onNinInput" />
          </label>
          <label for="profile-nif">
            {{ t('profile.nif') }}
            <input id="profile-nif" :value="form.nif" maxlength="20" :placeholder="t('profile.optional')" @input="onNifInput" />
          </label>

          <label for="profile-wilaya">
            {{ t('profile.homeWilaya') }}
            <select id="profile-wilaya" :value="form.home_wilaya_id" @change="onWilayaChange">
              <option value="">{{ t('profile.notProvided') }}</option>
              <option v-for="w in wilayas" :key="w.id" :value="String(w.id)">{{ w.code }} — {{ w.nom_fr }}</option>
            </select>
          </label>
          <label for="profile-commune">
            {{ t('profile.homeCommune') }}
            <select id="profile-commune" v-model="form.home_commune_id" :disabled="!form.home_wilaya_id">
              <option value="">{{ t('profile.notProvided') }}</option>
              <option v-for="c in communes" :key="c.id" :value="String(c.id)">{{ c.nom_fr }}</option>
            </select>
          </label>

          <label for="profile-gps-lat">
            {{ t('profile.gpsLat') }}
            <input id="profile-gps-lat" v-model="form.gps_lat" type="number" step="0.000001" />
          </label>
          <label for="profile-gps-lon">
            {{ t('profile.gpsLon') }}
            <input id="profile-gps-lon" v-model="form.gps_lon" type="number" step="0.000001" />
          </label>
          <div>
            <button type="button" class="btn ghost small" :disabled="locating" @click="useCurrentLocation">
              {{ locating ? t('profile.locating') : t('profile.useCurrentLocation') }}
            </button>
          </div>

          <button class="btn primary" :disabled="saving">{{ saving ? t('profile.saving') : t('profile.save') }}</button>
        </form>
      </div>

      <PushNotificationsCard />
      <EmergencyContactsCard />
      <FavoritesCard />
      <WaitlistCard />
    </div>
  </section>
</template>
