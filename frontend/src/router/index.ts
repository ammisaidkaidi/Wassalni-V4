import { createRouter, createWebHistory } from 'vue-router';

// Same 12 routes, same order, as the original React `App.tsx`'s <Routes>.
// AdminPage and DriverPage are lazy-loaded (dynamic import) — an internal,
// build-time-only optimization (smaller initial bundle) with zero behavior
// change for the user; every other route is small enough that eager loading
// matches the original app's single-bundle behavior closely enough not to
// bother splitting it.
export const router = createRouter({
  history: createWebHistory(),
  // The original React app used react-router-dom's <NavLink>, whose default
  // active class is "active" (styled in index.css: `.topbar nav a.active`,
  // `.admin-nav-item.active`). vue-router defaults to
  // "router-link-active"/"router-link-exact-active" instead, so both are
  // remapped to "active" here to keep the ported CSS working unchanged.
  linkActiveClass: 'active',
  linkExactActiveClass: 'active',
  routes: [
    { path: '/', name: 'home', component: () => import('../pages/HomePage.vue') },
    { path: '/trips/:id', name: 'trip-detail', component: () => import('../pages/TripDetailPage.vue') },
    { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue') },
    { path: '/register', name: 'register', component: () => import('../pages/RegisterPage.vue') },
    { path: '/reservations', name: 'reservations', component: () => import('../pages/MyReservationsPage.vue') },
    { path: '/wallet', name: 'wallet', component: () => import('../pages/WalletPage.vue') },
    { path: '/profile', name: 'profile', component: () => import('../pages/ProfilePage.vue') },
    { path: '/driver', name: 'driver', component: () => import('../pages/DriverPage.vue') },
    { path: '/admin', name: 'admin', component: () => import('../pages/AdminPage.vue') },
    { path: '/track/:token', name: 'share-tracking', component: () => import('../pages/ShareTrackingPage.vue') },
    { path: '/init-db', name: 'init-db', component: () => import('../pages/InitDbPage.vue') },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFoundPage.vue') },
  ],
});
