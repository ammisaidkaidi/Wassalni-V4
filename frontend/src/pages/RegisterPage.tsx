import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useI18n } from '../i18n';

export default function RegisterPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', referral_code: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      // Task 9.4 — referral_code is optional; omit entirely rather than send
      // an empty string so the server's nullish check isn't tripped by "".
      const { referral_code, ...rest } = form;
      await api('/api/auth/register', {
        method: 'POST',
        body: referral_code.trim() ? { ...rest, referral_code: referral_code.trim() } : rest,
      });
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="narrow">
      <h1>{t('register.title')}</h1>
      <form className="card" onSubmit={(e) => void submit(e)}>
        <label htmlFor="register-name">
          {t('register.fullName')}
          <input
            id="register-name"
            required
            minLength={2}
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            autoComplete="name"
          />
        </label>
        <label htmlFor="register-email">
          {t('register.email')}
          <input
            id="register-email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </label>
        <label htmlFor="register-phone">
          {t('register.phone')}
          <input
            id="register-phone"
            required
            pattern="^\+?[0-9]{8,15}$"
            placeholder={t('register.phonePlaceholder')}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
          />
        </label>
        <label htmlFor="register-password">
          {t('register.password')}
          <input
            id="register-password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
          />
        </label>
        <label htmlFor="register-referral">
          {t('register.referralCode')}
          <input
            id="register-referral"
            placeholder={t('register.referralPlaceholder')}
            value={form.referral_code}
            onChange={(e) => setForm({ ...form, referral_code: e.target.value })}
          />
        </label>
        <button className="btn primary wide" disabled={busy}>
          {busy ? t('register.creating') : t('register.submit')}
        </button>
        <p className="muted center">
          {t('register.alreadyRegistered')} <Link to="/login">{t('register.login')}</Link>
        </p>
      </form>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
