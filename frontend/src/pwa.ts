/**
 * Task 16.1 — PWA service-worker registration.
 *
 * Kept as a tiny, dependency-free helper (no vite-plugin-pwa / workbox) so
 * the precache list in public/sw.js stays easy to audit by hand. Registered
 * unconditionally (dev and prod): the dev server also serves /sw.js as a
 * static file from public/, so this exercises the exact same code path the
 * production build ships.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
