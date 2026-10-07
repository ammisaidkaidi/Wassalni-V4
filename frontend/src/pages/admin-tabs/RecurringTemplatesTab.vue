<script setup lang="ts">
/** Task 10.3 — recurring trip templates (generate a week's worth of trips at once). */
import { computed, onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { DriverRow, RecurringTemplateRow, TrajectoryRow } from '../../types';

const { t } = useI18n();
const WEEKDAYS = computed(() => [
  t('admin.recurring.weekdays.d0'),
  t('admin.recurring.weekdays.d1'),
  t('admin.recurring.weekdays.d2'),
  t('admin.recurring.weekdays.d3'),
  t('admin.recurring.weekdays.d4'),
  t('admin.recurring.weekdays.d5'),
  t('admin.recurring.weekdays.d6'),
]);

const rows = ref<RecurringTemplateRow[]>([]);
const trajectories = ref<TrajectoryRow[]>([]);
const drivers = ref<DriverRow[]>([]);
const form = ref({
  trajectory_id: '',
  driver_id: '',
  weekdays: [] as number[],
  departure_time: '08:00',
  capacity: '20',
  seat_price: '500',
  starts_on: new Date().toISOString().slice(0, 10),
  ends_on: '',
  horizon_days: '14',
});
const msg = ref('');

async function load(): Promise<void> {
  try {
    const [tpl, tj, d] = await Promise.all([
      api<{ templates: RecurringTemplateRow[] }>('/api/admin/recurring-templates'),
      api<{ trajectories: TrajectoryRow[] }>('/api/admin/trajectories'),
      api<{ drivers: DriverRow[] }>('/api/admin/drivers'),
    ]);
    rows.value = tpl.templates;
    trajectories.value = tj.trajectories;
    drivers.value = d.drivers;
  } catch (e) {
    msg.value = e instanceof Error ? e.message : String(e);
  }
}

onMounted(load);

function toggleWeekday(d: number): void {
  form.value.weekdays = form.value.weekdays.includes(d)
    ? form.value.weekdays.filter((x) => x !== d)
    : [...form.value.weekdays, d].sort();
}

async function create(e: Event): Promise<void> {
  e.preventDefault();
  msg.value = '';
  try {
    await api('/api/admin/recurring-templates', {
      method: 'POST',
      body: {
        trajectory_id: form.value.trajectory_id,
        driver_id: form.value.driver_id || null,
        weekdays: form.value.weekdays,
        departure_time: form.value.departure_time,
        capacity: Number(form.value.capacity),
        seat_price: Number(form.value.seat_price),
        starts_on: form.value.starts_on,
        ends_on: form.value.ends_on || null,
        horizon_days: Number(form.value.horizon_days),
      },
    });
    msg.value = t('admin.recurring.created');
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function generate(id: string): Promise<void> {
  msg.value = '';
  try {
    const r = await api<{ generated: number }>(`/api/admin/recurring-templates/${id}/generate`, { method: 'POST', body: {} });
    msg.value = t('admin.recurring.generated', { count: r.generated });
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

async function cancelTemplate(id: string): Promise<void> {
  if (!confirm(t('admin.recurring.stopConfirm'))) return;
  msg.value = '';
  try {
    const r = await api<{ cancelled: number }>(`/api/admin/recurring-templates/${id}/cancel`, { method: 'POST', body: {} });
    msg.value = t('admin.recurring.stopped_', { count: r.cancelled });
    await load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.recurring.intro') }}</p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <form class="form-grid card" style="margin-bottom: 16px" @submit="void create($event)">
      <label for="recurring-trajectory">
        {{ t('admin.common.trajectory') }}
        <select id="recurring-trajectory" v-model="form.trajectory_id" required>
          <option value="">{{ t('admin.common.pickOption') }}</option>
          <option v-for="tr in trajectories" :key="tr.id" :value="tr.id">{{ tr.name }}</option>
        </select>
      </label>
      <label for="recurring-driver">
        {{ t('admin.recurring.driverOptional') }}
        <select id="recurring-driver" v-model="form.driver_id">
          <option value="">{{ t('admin.common.pickOption') }}</option>
          <option v-for="d in drivers" :key="d.id" :value="d.id">{{ d.full_name }}</option>
        </select>
      </label>
      <label for="recurring-time">
        {{ t('admin.recurring.departureTime') }}
        <input id="recurring-time" v-model="form.departure_time" type="time" required />
      </label>
      <label for="recurring-capacity">
        {{ t('admin.common.capacity') }}
        <input id="recurring-capacity" v-model="form.capacity" type="number" min="1" required />
      </label>
      <label for="recurring-seat-price">
        {{ t('admin.recurring.seatPrice') }}
        <input id="recurring-seat-price" v-model="form.seat_price" type="number" min="0" required />
      </label>
      <label for="recurring-start">
        {{ t('admin.recurring.startDate') }}
        <input id="recurring-start" v-model="form.starts_on" type="date" required />
      </label>
      <label for="recurring-end">
        {{ t('admin.recurring.endDateOptional') }}
        <input id="recurring-end" v-model="form.ends_on" type="date" />
      </label>
      <label for="recurring-horizon">
        {{ t('admin.recurring.generationHorizon') }}
        <input id="recurring-horizon" v-model="form.horizon_days" type="number" min="1" max="90" />
      </label>
      <div>
        <span class="muted small">{{ t('admin.recurring.weekdaysLabel') }}</span>
        <div style="display: flex; gap: 4px; margin-top: 4px">
          <button
            v-for="(label, i) in WEEKDAYS"
            :key="i"
            type="button"
            :class="`tab${form.weekdays.includes(i) ? ' active' : ''}`"
            style="padding: 4px 8px"
            @click="toggleWeekday(i)"
          >
            {{ label }}
          </button>
        </div>
      </div>
      <button class="btn primary">{{ t('admin.recurring.createTemplate') }}</button>
    </form>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.trajectory') }}</th>
            <th>{{ t('admin.common.driver') }}</th>
            <th>{{ t('admin.recurring.days') }}</th>
            <th>{{ t('admin.recurring.time') }}</th>
            <th>{{ t('admin.common.price') }}</th>
            <th>{{ t('admin.recurring.generatedThrough') }}</th>
            <th>{{ t('admin.common.status') }}</th>
            <th>{{ t('admin.common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.id">
            <td>{{ r.trajectory_name }}</td>
            <td>{{ r.driver_name ?? '—' }}</td>
            <td>{{ r.weekdays.map((d) => WEEKDAYS[d]).join(', ') }}</td>
            <td>{{ r.departure_time }}</td>
            <td>{{ Number(r.seat_price).toLocaleString('fr-DZ') }}</td>
            <td>{{ r.last_generated_through ?? '—' }}</td>
            <td><span :class="`chip ${r.active ? 'confirmed' : 'cancelled'}`">{{ r.active ? t('admin.recurring.active') : t('admin.recurring.stopped') }}</span></td>
            <td class="actions">
              <template v-if="r.active">
                <button class="btn ghost small" @click="void generate(r.id)">{{ t('admin.recurring.generate') }}</button>
                <button class="btn danger small" @click="void cancelTemplate(r.id)">{{ t('admin.recurring.stop') }}</button>
              </template>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="8" class="empty">{{ t('admin.recurring.none') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
