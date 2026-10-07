<script setup lang="ts">
/** Platform configuration (Task 12.4's "change configuration" audit example). */
import { onMounted, ref } from 'vue';
import { api, fmtDateTime } from '../../api';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();
const rows = ref<{ key: string; value: string; updated_at: string }[]>([]);
const edits = ref<Record<string, string>>({});
const msg = ref('');

function load(): void {
  api<{ settings: { key: string; value: string; updated_at: string }[] }>('/api/admin/settings')
    .then((r) => {
      rows.value = r.settings;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
}

onMounted(load);

async function save(key: string): Promise<void> {
  if (edits.value[key] === undefined) return;
  msg.value = '';
  try {
    await api(`/api/admin/settings/${encodeURIComponent(key)}`, { method: 'PUT', body: { value: edits.value[key] } });
    msg.value = t('admin.common.saved');
    load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

function onEdit(key: string, e: Event): void {
  edits.value = { ...edits.value, [key]: (e.target as HTMLInputElement).value };
}
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.settings.intro') }}</p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.settings.key') }}</th>
            <th>{{ t('admin.settings.value') }}</th>
            <th>{{ t('admin.settings.updatedAt') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.key">
            <td>{{ r.key }}</td>
            <td>
              <input :aria-label="r.key" :value="edits[r.key] ?? r.value" @input="onEdit(r.key, $event)" />
            </td>
            <td class="muted small">{{ fmtDateTime(r.updated_at) }}</td>
            <td>
              <button class="btn ghost small" @click="void save(r.key)">{{ t('admin.common.save') }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
