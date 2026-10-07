<script setup lang="ts">
/** Task 12.6 — granular admin roles (super_admin only may reassign). */
import { computed, onMounted, ref } from 'vue';
import { api } from '../../api';
import { useAuth } from '../../composables/useAuth';
import { useI18n } from '../../composables/useI18n';
import type { AdminUserRow } from '../../types';

const { t } = useI18n();
const { user } = useAuth();
const rows = ref<AdminUserRow[]>([]);
const msg = ref('');

function load(): void {
  api<{ admins: AdminUserRow[] }>('/api/admin/admins')
    .then((r) => {
      rows.value = r.admins;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
}

onMounted(load);

const ROLES = ['super_admin', 'admin', 'support', 'finance', 'operations'] as const;

async function setRole(id: string, role: string): Promise<void> {
  msg.value = '';
  try {
    await api(`/api/admin/admins/${id}/role`, { method: 'POST', body: { admin_role: role } });
    msg.value = t('admin.admins.roleUpdated');
    load();
  } catch (err) {
    msg.value = err instanceof Error ? err.message : String(err);
  }
}

const canEdit = computed(() => user.value?.admin_role === 'super_admin');
</script>

<template>
  <div>
    <p class="muted">{{ t('admin.admins.intro') }}</p>
    <p v-if="msg" class="alert info" role="status">{{ msg }}</p>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.name') }}</th>
            <th>{{ t('admin.common.email') }}</th>
            <th>{{ t('admin.admins.role') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in rows" :key="a.id">
            <td>{{ a.full_name }}</td>
            <td>{{ a.email }}</td>
            <td>
              <select :disabled="!canEdit" :value="a.admin_role ?? 'admin'" @change="void setRole(a.id, ($event.target as HTMLSelectElement).value)">
                <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
              </select>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
