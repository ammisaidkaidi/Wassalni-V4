<script setup lang="ts">
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();
</script>

<template>
  <p class="empty">{{ t('notFound.text') }}</p>
</template>
