import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import './index.css';
import { registerServiceWorker } from './pwa';
import { router } from './router';
import { useThemeStore } from './stores/theme';
import { useI18nStore } from './stores/i18n';
import { useAuthStore } from './stores/auth';

registerServiceWorker();

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

// Apply the persisted/detected theme + language to <html> immediately on
// boot (replaces the React versions' mount-time useEffect in each Context
// provider), then kick off the initial session check (replaces
// AuthProvider's effect calling refresh() once on mount).
useThemeStore().applyToDom();
useI18nStore().applyToDom();
void useAuthStore().refresh();

app.mount('#root');
