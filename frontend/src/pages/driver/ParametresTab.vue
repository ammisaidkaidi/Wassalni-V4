<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import PushNotificationsCard from '../../components/PushNotificationsCard.vue';
import type { DriverProfileRow, VehicleRow } from '../../types';

const { t } = useI18n();
const profile = ref<DriverProfileRow | null>(null);
const vehicle = ref<VehicleRow | null>(null);
const profileForm = ref({ full_name: '', phone: '', email: '', address: '' });
const vehicleForm = ref({
  matricule: '',
  seats: '4',
  make: '',
  model: '',
  wheelchair_accessible: false,
  pets_allowed: true,
  luggage_capacity: '',
});
const msg = ref('');

async function load(): Promise<void> {
  try {
    const r = await api<{ driver: DriverProfileRow; vehicle: VehicleRow | null }>('/api/driver/me');
    profile.value = r.driver;
    vehicle.value = r.vehicle;
    profileForm.value = {
      full_name: r.driver.full_name,
      phone: r.driver.phone,
      email: r.driver.email ?? '',
      address: r.driver.address ?? '',
    };
    if (r.vehicle) {
      vehicleForm.value = {
        matricule: r.vehicle.matricule,
        seats: String(r.vehicle.seats),
        make: r.vehicle.make ?? '',
        model: r.vehicle.model ?? '',
        wheelchair_accessible: r.vehicle.wheelchair_accessible ?? false,
        pets_allowed: r.vehicle.pets_allowed ?? true,
        luggage_capacity: r.vehicle.luggage_capacity != null ? String(r.vehicle.luggage_capacity) : '',
      };
    }
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(load);

async function saveProfile(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api('/api/driver/me', {
      method: 'PATCH',
      body: {
        full_name: profileForm.value.full_name,
        phone: profileForm.value.phone,
        email: profileForm.value.email || null,
        address: profileForm.value.address || null,
      },
    });
    msg.value = t('driver.settings.profileUpdated');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function saveVehicle(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    const body = {
      matricule: vehicleForm.value.matricule,
      seats: Number(vehicleForm.value.seats),
      make: vehicleForm.value.make || null,
      model: vehicleForm.value.model || null,
      wheelchair_accessible: vehicleForm.value.wheelchair_accessible,
      pets_allowed: vehicleForm.value.pets_allowed,
      luggage_capacity: vehicleForm.value.luggage_capacity !== '' ? Number(vehicleForm.value.luggage_capacity) : null,
    };
    if (vehicle.value) {
      await api('/api/driver/vehicle', { method: 'PATCH', body });
      msg.value = t('driver.settings.vehicleUpdated');
    } else {
      // Accessibility fields aren't accepted by the creation endpoint (only
      // matricule/seats/make/model) — immediately follow up with a PATCH so
      // they still take effect from the very first save, not just the next one.
      await api('/api/driver/vehicle', { method: 'POST', body });
      await api('/api/driver/vehicle', {
        method: 'PATCH',
        body: { wheelchair_accessible: body.wheelchair_accessible, pets_allowed: body.pets_allowed, luggage_capacity: body.luggage_capacity },
      });
      msg.value = t('driver.settings.vehicleSaved');
    }
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <p v-if="!profile && msg" class="alert error" role="alert">{{ msg }}</p>
  <p v-else-if="!profile" class="empty">{{ t('driver.loading') }}</p>
  <div v-else class="detail-grid">
    <p v-if="msg" class="alert info" style="grid-column: 1 / -1" role="status">{{ msg }}</p>

    <div class="card">
      <h2 style="margin-top: 0">{{ t('driver.settings.myProfile') }}</h2>
      <p class="muted small">{{ t('driver.settings.ninNote', { nin: profile.nin }) }}</p>
      <p>
        <template v-if="profile.rating_count > 0">
          {{ t('driver.settings.ratingSummary', { avg: Number(profile.rating_avg).toFixed(1), count: profile.rating_count, s: profile.rating_count > 1 ? 's' : '' }) }}
        </template>
        <span v-else class="muted">{{ t('driver.settings.noRatings') }}</span>
        <span v-if="profile.trust_badge" class="chip confirmed" style="margin-left: 8px">{{ t('driver.settings.trustBadge') }}</span>
      </p>
      <p v-if="profile.no_show_count > 0" :class="`alert ${profile.flagged_at ? 'error' : 'info'}`" :role="profile.flagged_at ? 'alert' : 'status'">
        {{ t('driver.settings.noShowWarning', { count: profile.no_show_count, flagged: profile.flagged_at ? t('driver.settings.flaggedSuffix') : '' }) }}
      </p>
      <form class="form-grid" @submit="void saveProfile($event)">
        <label for="driver-profile-name">
          {{ t('driver.settings.fullName') }}
          <input id="driver-profile-name" v-model="profileForm.full_name" required minlength="2" />
        </label>
        <label for="driver-profile-phone">
          {{ t('driver.settings.phone') }}
          <input id="driver-profile-phone" v-model="profileForm.phone" required />
        </label>
        <label for="driver-profile-email">
          {{ t('driver.settings.email') }}
          <input id="driver-profile-email" v-model="profileForm.email" type="email" />
        </label>
        <label for="driver-profile-address">
          {{ t('driver.settings.address') }}
          <input id="driver-profile-address" v-model="profileForm.address" />
        </label>
        <button class="btn primary">{{ t('driver.settings.save') }}</button>
      </form>
    </div>

    <div class="card">
      <h2 style="margin-top: 0">{{ t('driver.settings.myVehicle') }}</h2>
      <p v-if="!vehicle" class="muted small">{{ t('driver.settings.noVehicle') }}</p>
      <p v-if="vehicle" class="muted small">{{ t('driver.settings.inspectionHint') }}</p>
      <form class="form-grid" @submit="void saveVehicle($event)">
        <label for="driver-vehicle-matricule">
          {{ t('driver.settings.matricule') }}
          <input id="driver-vehicle-matricule" v-model="vehicleForm.matricule" required minlength="3" />
        </label>
        <label for="driver-vehicle-seats">
          {{ t('driver.settings.seats') }}
          <input id="driver-vehicle-seats" v-model="vehicleForm.seats" type="number" min="1" required />
        </label>
        <label for="driver-vehicle-make">
          {{ t('driver.settings.make') }}
          <input id="driver-vehicle-make" v-model="vehicleForm.make" />
        </label>
        <label for="driver-vehicle-model">
          {{ t('driver.settings.model') }}
          <input id="driver-vehicle-model" v-model="vehicleForm.model" />
        </label>
        <label for="driver-vehicle-luggage">
          {{ t('driver.settings.luggageCapacity') }}
          <input id="driver-vehicle-luggage" v-model="vehicleForm.luggage_capacity" type="number" min="0" />
        </label>
        <label style="flex-direction: row; align-items: center; gap: 6px">
          <input v-model="vehicleForm.wheelchair_accessible" type="checkbox" />
          {{ t('driver.settings.wheelchairAccessible') }}
        </label>
        <label style="flex-direction: row; align-items: center; gap: 6px">
          <input v-model="vehicleForm.pets_allowed" type="checkbox" />
          {{ t('driver.settings.petsAllowed') }}
        </label>
        <button class="btn primary">{{ vehicle ? t('driver.settings.update') : t('driver.settings.save') }}</button>
      </form>
    </div>

    <PushNotificationsCard />
  </div>
</template>
