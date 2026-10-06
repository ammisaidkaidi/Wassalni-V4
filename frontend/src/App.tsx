import { useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { setDbUnavailableHandler } from './api';
import { useAuth } from './auth';
import InstallAppButton from './components/InstallAppButton';
import NotificationBell from './components/NotificationBell';
import { LANGS, useI18n } from './i18n';
import AdminPage from './pages/AdminPage';
import DriverPage from './pages/DriverPage';
import HomePage from './pages/HomePage';
import InitDbPage from './pages/InitDbPage';
import LoginPage from './pages/LoginPage';
import MyReservationsPage from './pages/MyReservationsPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import ShareTrackingPage from './pages/ShareTrackingPage';
import TripDetailPage from './pages/TripDetailPage';
import WalletPage from './pages/WalletPage';
import { useTheme } from './theme';

export default function App() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Self-healing setup screen: redirect to /init-db whenever the backend
  // reports its database isn't configured/reachable — either detected
  // up-front on first load, or mid-session via any api() call that comes
  // back with the DB_UNAVAILABLE signal (see api.ts / backend degraded mode).
  useEffect(() => {
    setDbUnavailableHandler(() => {
      if (window.location.pathname !== '/init-db') navigate('/init-db');
    });
    fetch('/api/init-db/status')
      .then((r) => r.json())
      .then((s: { connected?: boolean }) => {
        if (!s.connected && window.location.pathname !== '/init-db') navigate('/init-db');
      })
      .catch(() => undefined);
    return () => setDbUnavailableHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Task — small-screen nav: the topbar's links + auth controls no longer
  // fit on one row below ~880px (see .topbar-panel in index.css), so they're
  // tucked behind this hamburger toggle instead of silently overflowing.
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Close on outside click…
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // …and whenever navigation actually happens (clicking a link inside the panel).
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        {t('nav.skipToContent')}
      </a>
      <header className="topbar" ref={headerRef}>
        <NavLink to="/" className="brand">
          🚐 Wassalni
        </NavLink>

        <button
          type="button"
          className="menu-toggle"
          aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={menuOpen}
          aria-controls="topbar-panel"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
        </button>

        <div id="topbar-panel" className={`topbar-panel${menuOpen ? ' open' : ''}`}>
          <nav aria-label={t('nav.search')}>
            <NavLink to="/" end>
              {t('nav.search')}
            </NavLink>
            {user?.customer_id && <NavLink to="/reservations">{t('nav.myReservations')}</NavLink>}
            {user?.customer_id && <NavLink to="/wallet">{t('nav.myWallet')}</NavLink>}
            {user?.customer_id && <NavLink to="/profile">{t('nav.myProfile')}</NavLink>}
            {user?.role === 'driver' && <NavLink to="/driver">{t('nav.driverSpace')}</NavLink>}
            {user?.role === 'admin' && <NavLink to="/admin">{t('nav.admin')}</NavLink>}
          </nav>
          <div className="auth">
            <label className="lang-switch">
              <span className="sr-only">{t('lang.switch')}</span>
              <select
                aria-label={t('lang.switch')}
                value={lang}
                onChange={(e) => setLang(e.target.value as typeof lang)}
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <InstallAppButton />
            <button
              type="button"
              className="btn ghost icon-btn"
              onClick={toggleTheme}
              aria-pressed={theme === 'dark'}
              title={t('theme.toggle')}
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="sr-only">{t('theme.toggle')}</span>
            </button>
            {user ? (
              <>
                <NotificationBell />
                <span className="who" title={user.email}>
                  {user.full_name}
                </span>
                <button className="btn ghost" onClick={() => void logout()}>
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login">{t('nav.login')}</NavLink>
                <NavLink to="/register" className="btn primary">
                  {t('nav.register')}
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container" id="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/trips/:id" element={<TripDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reservations" element={<MyReservationsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/driver" element={<DriverPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/track/:token" element={<ShareTrackingPage />} />
          <Route path="/init-db" element={<InitDbPage />} />
          <Route path="*" element={<p className="empty">{t('notFound.text')}</p>} />
        </Routes>
      </main>

      <footer className="footer">{t('footer.text')}</footer>
    </div>
  );
}
