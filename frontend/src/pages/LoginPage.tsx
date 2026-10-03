import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, setSessionToken } from '../api';
import { useAuth } from '../auth';

interface Challenge {
  otp_required: true;
  otp_token: string;
  expires_in: number;
  dev_code?: string;
}

export default function LoginPage() {
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

  const resend = async (): Promise<void> => {
    setError('');
    setBusy(true);
    try {
      if (challenge) setChallenge(await api<Challenge>('/api/auth/resend-2fa', { method: 'POST', body: { otp_token: challenge.otp_token } }));
      setCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="narrow">
      <h1>Connexion</h1>
      {step === 'password' ? (
        <form className="card" onSubmit={(e) => void submitPassword(e)}>
          <label>
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.dz" />
          </label>
          <label>
            Mot de passe
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button className="btn primary wide" disabled={busy}>
            {busy ? 'Vérification…' : 'Continuer'}
          </button>
          <p className="muted center">
            Pas de compte ? <Link to="/register">Créer un compte</Link>
          </p>
        </form>
      ) : (
        <form className="card" onSubmit={(e) => void submitCode(e)}>
          <p className="muted">
            Un code à 6 chiffres a été envoyé à <strong>{email}</strong>.
          </p>
          {challenge?.dev_code && <p className="alert info">Mode dev (pas de SMTP) — code : <strong>{challenge.dev_code}</strong></p>}
          <label>
            Code de vérification
            <input
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="······"
              className="otp-input"
            />
          </label>
          <button className="btn primary wide" disabled={busy || code.length !== 6}>
            {busy ? 'Vérification…' : 'Valider'}
          </button>
          <button type="button" className="btn ghost wide" disabled={busy} onClick={() => void resend()}>
            Renvoyer le code
          </button>
        </form>
      )}
      {error && <p className="alert error">{error}</p>}
    </section>
  );
}
