<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { setDbUnavailableHandler } from './api';
import { useAuth } from './composables/useAuth';
import { useI18n, LANGS } from './composables/useI18n';
import { useTheme } from './composables/useTheme';
import InstallAppButton from './components/InstallAppButton.vue';
import NotificationBell from './components/NotificationBell.vue';
import { router } from './router';

const { user, logout } = useAuth();
const { t, lang, setLang } = useI18n();
const { theme, toggleTheme } = useTheme();
const route = useRoute();

// Self-healing setup screen: redirect to /init-db whenever the backend
// reports its database isn't configured/reachable — either detected
// up-front on first load, or mid-session via any api() call that comes
// back with the DB_UNAVAILABLE signal (see api.ts / backend degraded mode).
onMounted(() => {
  setDbUnavailableHandler(() => {
    if (window.location.pathname !== '/init-db') void router.push('/init-db');
  });
  fetch('/api/init-db/status')
    .then((r) => r.json())
    .then((s: { connected?: boolean }) => {
      if (!s.connected && window.location.pathname !== '/init-db') void router.push('/init-db');
    })
    .catch(() => undefined);
});
onUnmounted(() => setDbUnavailableHandler(null));

// Task — small-screen nav: the topbar's links + auth controls no longer
// fit on one row below ~880px (see .topbar-panel in index.css), so they're
// tucked behind this hamburger toggle instead of silently overflowing.
const menuOpen = ref(false);
const headerRef = ref<HTMLElement | null>(null);

// Close on outside click…
function onClickOutside(e: MouseEvent): void {
  if (headerRef.value && !headerRef.value.contains(e.target as Node)) menuOpen.value = false;
}
onMounted(() => document.addEventListener('mousedown', onClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside));

// …and whenever navigation actually happens (clicking a link inside the panel).
watch(
  () => route.path,
  () => {
    menuOpen.value = false;
  },
);

function onLangChange(e: Event): void {
  setLang((e.target as HTMLSelectElement).value as 'fr' | 'ar' | 'en');
}
</script>

<template>
  <div class="app">
    <a href="#main-content" class="skip-link">{{ t('nav.skipToContent') }}</a>
    <header ref="headerRef" class="topbar">
      <router-link to="/" class="brand">🚐 Wassalni</router-link>

      <button
        type="button"
        class="menu-toggle"
        :aria-label="menuOpen ? t('nav.closeMenu') : t('nav.openMenu')"
        :aria-expanded="menuOpen"
        aria-controls="topbar-panel"
        @click="menuOpen = !menuOpen"
      >
        <span aria-hidden="true">{{ menuOpen ? '✕' : '☰' }}</span>
      </button>

      <div id="topbar-panel" :class="`topbar-panel${menuOpen ? ' open' : ''}`">
        <nav :aria-label="t('nav.search')">
          <router-link to="/">{{ t('nav.search') }}</router-link>
          <router-link v-if="user?.customer_id" to="/reservations">{{ t('nav.myReservations') }}</router-link>
          <router-link v-if="user?.customer_id" to="/wallet">{{ t('nav.myWallet') }}</router-link>
          <router-link v-if="user?.customer_id" to="/profile">{{ t('nav.myProfile') }}</router-link>
          <router-link v-if="user?.role === 'driver'" to="/driver">{{ t('nav.driverSpace') }}</router-link>
          <router-link v-if="user?.role === 'admin'" to="/admin">{{ t('nav.admin') }}</router-link>
        </nav>
        <div class="auth">
          <label class="lang-switch">
            <span class="sr-only">{{ t('lang.switch') }}</span>
            <select :aria-label="t('lang.switch')" :value="lang" @change="onLangChange">
              <option v-for="l in LANGS" :key="l.code" :value="l.code">{{ l.label }}</option>
            </select>
          </label>
          <InstallAppButton />
          <button
            type="button"
            class="btn ghost icon-btn"
            :aria-pressed="theme === 'dark'"
            :title="t('theme.toggle')"
            @click="toggleTheme"
          >
            <span aria-hidden="true">{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
            <span class="sr-only">{{ t('theme.toggle') }}</span>
          </button>
          <template v-if="user">
            <NotificationBell />
            <span class="who" :title="user.email">{{ user.full_name }}</span>
            <button class="btn ghost" @click="void logout()">{{ t('nav.logout') }}</button>
          </template>
          <template v-else>
            <router-link to="/login">{{ t('nav.login') }}</router-link>
            <router-link to="/register" class="btn primary">{{ t('nav.register') }}</router-link>
          </template>
        </div>
      </div>
    </header>

    <main class="container" id="main-content">
      <router-view />
    </main>

    <footer class="footer">{{ t('footer.text') }}</footer>
  </div>
</template>
