<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../api';
import { useI18n } from '../../composables/useI18n';
import type { DomainErrorRow } from '../../types';

const { t } = useI18n();
const rows = ref<DomainErrorRow[]>([]);
const msg = ref('');

onMounted(() => {
  api<{ errors: DomainErrorRow[] }>('/api/registry/errors')
    .then((r) => {
      rows.value = r.errors;
    })
    .catch((e) => {
      msg.value = e instanceof Error ? e.message : String(e);
    });
});
</script>

<template>
  <div>
    <p v-if="msg" class="alert error" role="alert">{{ msg }}</p>
    <p class="muted">{{ t('admin.errors.intro') }}</p>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('admin.common.code') }}</th>
            <th>{{ t('admin.errors.name') }}</th>
            <th>{{ t('admin.errors.description') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.sqlstate">
            <td><span class="chip">{{ r.sqlstate }}</span></td>
            <td>{{ r.code_name }}</td>
            <td>{{ r.description }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
