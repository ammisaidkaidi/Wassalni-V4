import { NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import NotificationBell from './components/NotificationBell';
import { LANGS, useI18n } from './i18n';
import AdminPage from './pages/AdminPage';
import DriverPage from './pages/DriverPage';
import HomePage from './pages/HomePage';
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

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        {t('nav.skipToContent')}
      </a>
      <header className="topbar">
        <NavLink to="/" className="brand">
          🚐 Wassalni
        </NavLink>
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
          <Route path="*" element={<p className="empty">{t('notFound.text')}</p>} />
        </Routes>
      </main>

      <footer className="footer">{t('footer.text')}</footer>
    </div>
  );
}
