// Wassalni service worker — Task 16.1 (PWA / offline shell) + Task 16.2 (web push).
//
// Scope and intent are deliberately narrow:
//  - Precache a tiny, hand-picked "app shell" (the start document, the
//    offline fallback page, the manifest and icons) so the app still opens
//    to *something* coherent with no network.
//  - Runtime-cache same-origin static assets (JS/CSS/fonts/images) with a
//    stale-while-revalidate strategy, so repeat visits are fast and still
//    work offline once warmed.
//  - NEVER intercept /api/* calls. Booking, payment, tracking and every
//    other piece of real domain data always goes straight to the network.
//    If the network is unavailable the request simply fails like normal —
//    we do not pretend a cached snapshot is live data, and we do not let a
//    stale GET quietly stand in for state that the server must own.
//  - Handle Web Push (Task 16.2): display a notification for every push
//    message, and route a click on it back into the running (or newly
//    opened) app at the most useful URL carried in the payload.
const CACHE_VERSION = 'wassalni-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_URLS = ['/', '/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isStaticAsset(request, url) {
  if (request.destination && ['script', 'style', 'image', 'font'].includes(request.destination)) return true;
  return /\.(js|css|png|jpg|jpeg|svg|webp|gif|woff2?|ttf)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never cache mutating calls
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // leave cross-origin (maps, CDNs…) alone
  if (isApiRequest(url)) return; // domain data always goes live — see header note

  // Navigations: network-first so users always get the current app build
  // when online, falling back to the cached shell (then the offline page)
  // the moment the network is unreachable.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(async () => (await caches.match('/')) || (await caches.match('/offline.html'))),
    );
    return;
  }

  if (isStaticAsset(request, url)) {
    // Stale-while-revalidate: serve from cache instantly if we have it,
    // refresh the cache in the background for next time.
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => undefined);
        return cached || (await network) || Response.error();
      }),
    );
  }
});

// ── Web push (Task 16.2) ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let payload = { title: 'Wassalni', body: '', url: '/' };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }
  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: payload.url || '/' },
    tag: payload.tag,
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'Wassalni', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(targetUrl);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  // Task 16.2 device management: if the browser silently rotates the
  // subscription (e.g. key rotation), re-subscribe and tell the server so
  // the old endpoint doesn't keep receiving (failing) pushes forever.
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription ? { userVisibleOnly: true, applicationServerKey: event.oldSubscription.options.applicationServerKey } : undefined)
      .then((subscription) =>
        fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ subscription }),
        }),
      )
      .catch(() => undefined),
  );
});
