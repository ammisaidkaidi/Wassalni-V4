import { NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import AdminPage from './pages/AdminPage';
import DriverPage from './pages/DriverPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import MyReservationsPage from './pages/MyReservationsPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import TripDetailPage from './pages/TripDetailPage';
import WalletPage from './pages/WalletPage';

export default function App() {
  const { user, logout } = useAuth();
  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand">
          🚐 Wassalni
        </NavLink>
        <nav>
          <NavLink to="/" end>
            Rechercher
          </NavLink>
          {user?.customer_id && <NavLink to="/reservations">Mes réservations</NavLink>}
          {user?.customer_id && <NavLink to="/wallet">Mon portefeuille</NavLink>}
          {user?.customer_id && <NavLink to="/profile">Mon profil</NavLink>}
          {user?.role === 'driver' && <NavLink to="/driver">Mon espace chauffeur</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="auth">
          {user ? (
            <>
              <span className="who" title={user.email}>
                {user.full_name}
              </span>
              <button className="btn ghost" onClick={() => void logout()}>
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Connexion</NavLink>
              <NavLink to="/register" className="btn primary">
                Créer un compte
              </NavLink>
            </>
          )}
        </div>
      </header>

      <main className="container">
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
          <Route path="*" element={<p className="empty">Page introuvable</p>} />
        </Routes>
      </main>

      <footer className="footer">Wassalni — démonstrateur (delivery domain v3 · Supabase)</footer>
    </div>
  );
}
