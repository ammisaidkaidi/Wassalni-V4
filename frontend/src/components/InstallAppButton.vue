<script setup lang="ts">
/**
 * Task 16.1 — PWA installability. Chromium/Edge/Android fire
 * `beforeinstallprompt` once the manifest + service-worker criteria are
 * met; we stash that event (the browser suppresses its own mini-infobar
 * once we call preventDefault) and expose a normal button that re-triggers
 * it on demand, anywhere in the topbar. Safari/iOS never fire this event —
 * there a user installs via the native "Add to Home Screen" share-sheet
 * action instead, so the button simply never appears there.
 */
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from '../composables/useI18n';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const { t } = useI18n();
const promptEvent = ref<BeforeInstallPromptEvent | null>(null);
const installed = ref(typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches);

function onBeforeInstall(e: Event): void {
  e.preventDefault();
  promptEvent.value = e as BeforeInstallPromptEvent;
}
function onInstalled(): void {
  installed.value = true;
  promptEvent.value = null;
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', onBeforeInstall);
  window.addEventListener('appinstalled', onInstalled);
});
onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  window.removeEventListener('appinstalled', onInstalled);
});

async function install(): Promise<void> {
  if (!promptEvent.value) return;
  await promptEvent.value.prompt();
  const choice = await promptEvent.value.userChoice;
  if (choice.outcome === 'accepted') installed.value = true;
  promptEvent.value = null;
}
</script>

<template>
  <button
    v-if="!installed && promptEvent"
    type="button"
    class="btn ghost icon-btn"
    :title="t('nav.installApp')"
    @click="void install()"
  >
    <span aria-hidden="true">⬇️</span>
    <span class="sr-only">{{ t('nav.installApp') }}</span>
  </button>
</template>
