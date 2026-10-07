<script setup lang="ts">
/**
 * Shared stop-list ("WPoint") editor used by both the Admin and Driver
 * trajectory tabs. Respects the deployed WPoint rules:
 *  - one wpoint per wilaya per trajectory (UNIQUE(trajectory_id, wilaya_id) —
 *    the backend's add_wpoint() merges instead of duplicating, so adding an
 *    already-present wilaya just re-selects it, never errors);
 *  - position is a dense 1..N ranking — reordering always resends the
 *    *entire* current id list so the result stays contiguous;
 *  - wilaya_id/trajectory_id are immutable once set (trg_wpoint_guard /
 *    DZ206) — this UI never attempts to change them, only position and the
 *    attached communes (the Wilaya is shown read-only inside the commune
 *    picker modal);
 *  - deleting a stop already used by an existing trip is blocked server-side
 *    (409 WPOINT_IN_USE) since trip_stop → wpoint cascades at the DB level;
 *    we just surface that error clearly instead of attempting to work around it.
 */
import { reactive, ref, watch } from 'vue';
import { ApiError, api } from '../api';
import { useI18n } from '../composables/useI18n';
import type { Wilaya, WpointRow } from '../types';
import CommuneSelectorModal from './CommuneSelectorModal.vue';

const props = defineProps<{
  /** Which backend area owns the trajectory: admin can manage any, driver only their own. */
  basePath: '/api/admin' | '/api/driver';
  trajectoryId: string;
  wilayas: Wilaya[];
}>();
const emit = defineEmits<{
  /** Notified every time the stop list changes, so the parent can refresh price-selector options etc. */
  wpointsChange: [wpoints: WpointRow[]];
}>();

const { t } = useI18n();
const wpoints = ref<WpointRow[]>([]);
const wilayaId = ref('');
const msg = ref('');
const error = ref('');
const busy = ref(false);
const communeModalFor = ref<WpointRow | null>(null);
const communeCounts = reactive<Record<string, number>>({});

async function load(): Promise<void> {
  if (!props.trajectoryId) {
    wpoints.value = [];
    emit('wpointsChange', []);
    return;
  }
  const r = await api<{ wpoints: WpointRow[] }>(`${props.basePath}/trajectories/${props.trajectoryId}/wpoints`);
  wpoints.value = r.wpoints;
  emit('wpointsChange', r.wpoints);
}

watch(
  () => [props.basePath, props.trajectoryId],
  () => {
    msg.value = '';
    error.value = '';
    communeModalFor.value = null;
    for (const k of Object.keys(communeCounts)) delete communeCounts[k];
    load().catch((e) => {
      error.value = e instanceof Error ? e.message : String(e);
    });
  },
  { immediate: true },
);

async function addWpoint(e: Event): Promise<void> {
  e.preventDefault();
  error.value = '';
  msg.value = '';
  try {
    await api(`${props.basePath}/trajectories/${props.trajectoryId}/wpoints`, { method: 'POST', body: { wilaya_id: Number(wilayaId.value) } });
    wilayaId.value = '';
    msg.value = t('wpointManager.stopAdded');
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
}

async function move(index: number, dir: -1 | 1): Promise<void> {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= wpoints.value.length || busy.value) return;
  const ids = wpoints.value.map((w) => w.id);
  const [moved] = ids.splice(index, 1);
  ids.splice(newIndex, 0, moved);
  error.value = '';
  msg.value = '';
  busy.value = true;
  try {
    await api(`${props.basePath}/trajectories/${props.trajectoryId}/wpoints/reorder`, { method: 'POST', body: { ids } });
    await load();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    busy.value = false;
  }
}

async function remove(wpointId: string, label: string): Promise<void> {
  error.value = '';
  msg.value = '';
  if (!window.confirm(t('wpointManager.confirmRemove', { label }))) return;
  try {
    await api(`${props.basePath}/trajectories/${props.trajectoryId}/wpoints/${wpointId}`, { method: 'DELETE' });
    msg.value = t('wpointManager.stopRemoved');
    await load();
  } catch (err) {
    if (err instanceof ApiError && err.code === 'WPOINT_IN_USE') {
      error.value = t('wpointManager.inUseError');
    } else {
      error.value = err instanceof Error ? err.message : String(err);
    }
  }
}

function onCommuneSaved(count: number): void {
  if (!communeModalFor.value) return;
  communeCounts[communeModalFor.value.id] = count;
  msg.value = t('wpointManager.communesUpdated');
}
</script>

<template>
  <div class="wpoint-manager">
    <p v-if="msg" class="alert success small" role="status">{{ msg }}</p>
    <p v-if="error" class="alert error small" role="alert">{{ error }}</p>
    <ol class="stops">
      <li v-for="(w, index) in wpoints" :key="w.id" class="wpoint-item">
        <span class="dot" />
        <div class="wpoint-body">
          <div class="wpoint-head">
            <strong>{{ w.position }}. {{ w.nom_fr }}</strong> <span class="muted">({{ w.nom_ar }})</span>
            <span v-if="communeCounts[w.id] !== undefined" class="muted small">
              — {{ t('wpointManager.communeCount', { count: communeCounts[w.id], s: communeCounts[w.id] > 1 ? 's' : '' }) }}
            </span>
            <button
              type="button"
              class="btn ghost small"
              :title="t('wpointManager.moveUp')"
              :aria-label="t('wpointManager.moveUp')"
              :disabled="index === 0 || busy"
              @click="void move(index, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="btn ghost small"
              :title="t('wpointManager.moveDown')"
              :aria-label="t('wpointManager.moveDown')"
              :disabled="index === wpoints.length - 1 || busy"
              @click="void move(index, 1)"
            >
              ↓
            </button>
            <button type="button" class="btn ghost small" @click="communeModalFor = w">{{ t('wpointManager.manageCommunes') }}</button>
            <button type="button" class="btn danger small" @click="void remove(w.id, w.nom_fr)">{{ t('wpointManager.remove') }}</button>
          </div>
        </div>
      </li>
    </ol>
    <form class="form-inline" @submit="void addWpoint($event)">
      <label for="wpoint-add-wilaya">
        {{ t('wpointManager.addStop') }}
        <select id="wpoint-add-wilaya" v-model="wilayaId" required>
          <option value="">{{ t('wpointManager.pickWilaya') }}</option>
          <option v-for="w in wilayas" :key="w.id" :value="String(w.id)">{{ w.nom_fr }}</option>
        </select>
      </label>
      <button class="btn primary">{{ t('wpointManager.add') }}</button>
    </form>

    <CommuneSelectorModal
      v-if="communeModalFor"
      :base-path="basePath"
      :trajectory-id="trajectoryId"
      :wpoint-id="communeModalFor.id"
      :wilaya-id="communeModalFor.wilaya_id"
      :wilaya-nom-fr="communeModalFor.nom_fr"
      :wilaya-nom-ar="communeModalFor.nom_ar"
      @close="communeModalFor = null"
      @saved="onCommuneSaved"
    />
  </div>
</template>
