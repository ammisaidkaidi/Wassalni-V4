<script setup lang="ts">
/** Minimal generic key/value table for analytics rows whose shape varies per query. */
import { computed } from 'vue';
import { useI18n } from '../../composables/useI18n';

const props = defineProps<{ title: string; rows: Record<string, unknown>[] }>();
const { t } = useI18n();
const columns = computed(() => (props.rows.length > 0 ? Object.keys(props.rows[0]) : []));
</script>

<template>
  <h2 style="margin-top: 22px">{{ title }}</h2>
  <p v-if="rows.length === 0" class="empty">{{ t('admin.common.noData') }}</p>
  <div v-else class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          <th v-for="c in columns" :key="c">{{ c }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in rows" :key="i">
          <td v-for="c in columns" :key="c">{{ String(r[c] ?? '—') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
