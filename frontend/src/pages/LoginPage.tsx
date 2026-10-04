import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, setSessionToken } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';

interface Challenge {
  otp_required: true;
  otp_token: string;
  expires_in: number;
  channel: 'email' | 'sms';
  can_use_sms: boolean;
  dev_code?: string;
}

export default function LoginPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submitPassword = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api<Challenge>('/api/auth/login', { method: 'POST', body: { email, password } });
      setChallenge(r);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api<{ user: unknown; token: string }>('/api/auth/verify-2fa', {
        method: 'POST',
        body: { otp_token: challenge?.otp_token, code },
      });
      setSessionToken(r.token);
      await refresh();
      navigate(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async (channel?: 'email' | 'sms'): Promise<void> => {
    setError('');
    setBusy(true);
    try {
      if (challenge)
        setChallenge(
          await api<Challenge>('/api/auth/resend-2fa', { method: 'POST', body: { otp_token: challenge.otp_token, channel } }),
        );
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="narrow">
      <h1>{t('login.title')}</h1>
      {step === 'password' ? (
        <form className="card" onSubmit={(e) => void submitPassword(e)}>
          <label htmlFor="login-email">
            {t('login.email')}
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPlaceholder')}
              autoComplete="email"
            />
          </label>
          <label htmlFor="login-password">
            {t('login.password')}
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button className="btn primary wide" disabled={busy}>
            {busy ? t('login.verifying') : t('login.continueBtn')}
          </button>
          <p className="muted center">
            {t('login.noAccount')} <Link to="/register">{t('login.createAccount')}</Link>
          </p>
        </form>
      ) : (
        <form className="card" onSubmit={(e) => void submitCode(e)}>
          <p className="muted">
            {challenge?.channel === 'sms' ? t('login.codeSentToSms') : t('login.codeSentTo', { email })}
          </p>
          {challenge?.dev_code && (
            <p className="alert info" role="status">
              {t('login.devModeCode', { code: challenge.dev_code })}
            </p>
          )}
          <label htmlFor="login-otp">
            {t('login.verificationCode')}
            <input
              id="login-otp"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="······"
              className="otp-input"
              autoComplete="one-time-code"
            />
          </label>
          <button className="btn primary wide" disabled={busy || code.length !== 6}>
            {busy ? t('login.verifying') : t('login.submit')}
          </button>
          <button type="button" className="btn ghost wide" disabled={busy} onClick={() => void resend()}>
            {t('login.resend')}
          </button>
          {challenge?.can_use_sms && (
            <button
              type="button"
              className="btn ghost wide"
              disabled={busy}
              onClick={() => void resend(challenge.channel === 'sms' ? 'email' : 'sms')}
            >
              {challenge.channel === 'sms' ? t('login.useEmailInstead') : t('login.useSmsInstead')}
            </button>
          )}
        </form>
      )}
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
