<script setup lang="ts">
/**
 * Modal editor for a single WPoint's Commune selection.
 *
 *   WPoint = { wilaya: READ_ONLY, communes: [] }
 *
 * The Wilaya is fixed and displayed read-only (it can never be changed from
 * here — wilaya_id is immutable on a wpoint once set, enforced server-side
 * by trg_wpoint_guard / DZ206). Daira is only a client-side grouping used to
 * select/deselect its Communes in bulk; it is never sent to or stored by the
 * backend — only the resulting Commune ids are persisted in WPoint.communes.
 *
 * Everything here is local state until "Confirmer" is pressed (one PUT with
 * the final set); "Annuler" just closes the modal and discards every change.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { api } from '../api';
import { useI18n } from '../composables/useI18n';
import type { CommuneRow, DairaRow } from '../types';
import { useFocusTrap } from '../composables/useFocusTrap';

const props = defineProps<{
  basePath: '/api/admin' | '/api/driver';
  trajectoryId: string;
  wpointId: string;
  wilayaId: number;
  wilayaNomFr: string;
  wilayaNomAr: string;
}>();
const emit = defineEmits<{
  close: [];
  /** Emitted only after a successful Confirm (server write). Never emitted on Cancel. */
  saved: [count: number];
}>();

type DairaState = 'all' | 'partial' | 'none';

const { t } = useI18n();
const modalRef = ref<HTMLDivElement | null>(null);
useFocusTrap(modalRef, true);

const dairas = ref<DairaRow[]>([]);
const communes = ref<CommuneRow[]>([]);
const selected = ref<Set<number>>(new Set());
const loading = ref(true);
const saving = ref(false);
const error = ref('');

function close(): void {
  emit('close');
}

async function loadAll(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const [d, c, sel] = await Promise.all([
      api<{ dairas: DairaRow[] }>(`/api/registry/wilayas/${props.wilayaId}/dairas`),
      api<{ communes: CommuneRow[] }>(`/api/registry/wilayas/${props.wilayaId}/communes`),
      api<{ commune_ids: number[] }>(`${props.basePath}/trajectories/${props.trajectoryId}/wpoints/${props.wpointId}/communes`),
    ]);
    dairas.value = d.dairas;
    communes.value = c.communes;
    selected.value = new Set(sel.commune_ids);
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadAll();

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', onKey);
  onUnmounted(() => window.removeEventListener('keydown', onKey));
});

const communesByDaira = computed(() => {
  const map = new Map<number, CommuneRow[]>();
  for (const c of communes.value) {
    const list = map.get(c.daira_id);
    if (list) list.push(c);
    else map.set(c.daira_id, [c]);
  }
  return map;
});

function dairaState(dairaId: number): DairaState {
  const list = communesByDaira.value.get(dairaId) ?? [];
  if (list.length === 0) return 'none';
  const n = list.filter((c) => selected.value.has(c.id)).length;
  if (n === 0) return 'none';
  if (n === list.length) return 'all';
  return 'partial';
}

function toggleCommune(id: number): void {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
}

function toggleDaira(dairaId: number): void {
  const list = communesByDaira.value.get(dairaId) ?? [];
  const state = dairaState(dairaId);
  const next = new Set(selected.value);
  if (state === 'all') {
    for (const c of list) next.delete(c.id);
  } else {
    for (const c of list) next.add(c.id);
  }
  selected.value = next;
}

function selectAll(): void {
  selected.value = new Set(communes.value.map((c) => c.id));
}
function deselectAll(): void {
  selected.value = new Set();
}
function invertSelection(): void {
  const next = new Set<number>();
  for (const c of communes.value) {
    if (!selected.value.has(c.id)) next.add(c.id);
  }
  selected.value = next;
}
function removeChip(id: number): void {
  toggleCommune(id);
}

const selectedCommunes = computed(() =>
  communes.value.filter((c) => selected.value.has(c.id)).sort((a, b) => a.nom_fr.localeCompare(b.nom_fr)),
);

async function confirm(): Promise<void> {
  saving.value = true;
  error.value = '';
  try {
    const r = await api<{ ok: true; count: number }>(`${props.basePath}/trajectories/${props.trajectoryId}/wpoints/${props.wpointId}/communes`, {
      method: 'PUT',
      body: { commune_ids: Array.from(selected.value) },
    });
    emit('saved', r.count);
    close();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    saving.value = false;
  }
}

function setIndeterminate(el: Element | null, state: DairaState): void {
  if (el) (el as HTMLInputElement).indeterminate = state === 'partial';
}

function onBackdropMouseDown(e: MouseEvent): void {
  if (e.target === e.currentTarget) close();
}
</script>

<template>
  <div class="modal-backdrop" @mousedown="onBackdropMouseDown">
    <div ref="modalRef" class="modal-box wpoint-modal" role="dialog" aria-modal="true" :aria-label="t('communeModal.dialogLabel')" tabindex="-1">
      <div class="modal-head">
        <h2>{{ t('communeModal.title') }}</h2>
        <button type="button" class="btn ghost small modal-x" :aria-label="t('communeModal.close')" @click="close">✕</button>
      </div>

      <div class="wpoint-readonly-wilaya">
        <span class="chip-label">{{ t('communeModal.readonlyWilaya') }}</span>
        <strong>{{ wilayaNomFr }}</strong> <span class="muted">({{ wilayaNomAr }})</span>
      </div>

      <p v-if="error" class="alert error small" role="alert">{{ error }}</p>

      <p v-if="loading" class="empty">{{ t('communeModal.loading') }}</p>
      <template v-else>
        <div class="wpoint-controls">
          <button type="button" class="btn ghost small" :disabled="saving" @click="selectAll">{{ t('communeModal.selectAll') }}</button>
          <button type="button" class="btn ghost small" :disabled="saving" @click="deselectAll">{{ t('communeModal.deselectAll') }}</button>
          <button type="button" class="btn ghost small" :disabled="saving" @click="invertSelection">{{ t('communeModal.invertSelection') }}</button>
          <span class="wpoint-count">{{ t('communeModal.selectedCount', { count: selected.size, s: selected.size > 1 ? 's' : '' }) }}</span>
        </div>

        <div class="wpoint-chips">
          <span v-if="selectedCommunes.length === 0" class="muted small">{{ t('communeModal.noneSelected') }}</span>
          <span v-for="c in selectedCommunes" :key="c.id" class="chip removable">
            {{ c.nom_fr }}
            <button type="button" :aria-label="t('communeModal.remove', { name: c.nom_fr })" :disabled="saving" @click="removeChip(c.id)">×</button>
          </span>
        </div>

        <div class="wpoint-daira-list">
          <details v-for="d in dairas" :key="d.id" :class="`daira-group daira-${dairaState(d.id)}`" :open="dairaState(d.id) !== 'none'">
            <summary>
              <input
                type="checkbox"
                :checked="dairaState(d.id) === 'all'"
                :ref="(el) => setIndeterminate(el as Element, dairaState(d.id))"
                :disabled="saving || (communesByDaira.get(d.id) ?? []).length === 0"
                @change="toggleDaira(d.id)"
                @click.stop
              />
              <span class="daira-name">{{ d.nom_fr }} <span class="muted">({{ d.nom_ar }})</span></span>
              <span class="daira-tally muted small">{{ (communesByDaira.get(d.id) ?? []).filter((c) => selected.has(c.id)).length }}/{{ (communesByDaira.get(d.id) ?? []).length }}</span>
            </summary>
            <ul class="commune-list">
              <li v-for="c in communesByDaira.get(d.id) ?? []" :key="c.id">
                <label>
                  <input type="checkbox" :checked="selected.has(c.id)" :disabled="saving" @change="toggleCommune(c.id)" />
                  {{ c.nom_fr }} <span class="muted">({{ c.nom_ar }})</span>
                </label>
              </li>
            </ul>
          </details>
        </div>
      </template>

      <div class="modal-foot">
        <button type="button" class="btn ghost" :disabled="saving" @click="close">{{ t('communeModal.cancel') }}</button>
        <button type="button" class="btn primary" :disabled="saving || loading" @click="void confirm()">
          {{ saving ? t('communeModal.saving') : t('communeModal.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
