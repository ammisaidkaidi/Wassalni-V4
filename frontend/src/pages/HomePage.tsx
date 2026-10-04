import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDateTime } from '../api';
import { useI18n } from '../i18n';
import type { TripSearchRow, Wilaya } from '../types';

export default function HomePage() {
  const { t, lang } = useI18n();
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [form, setForm] = useState({ from: '', to: '', dateFrom: '', dateTo: '' });
  const [results, setResults] = useState<TripSearchRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ wilayas: Wilaya[] }>('/api/registry/wilayas')
      .then((r) => setWilayas(r.wilayas))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const search = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const q = new URLSearchParams({ from: form.from, to: form.to });
      if (form.dateFrom) q.set('date_from', form.dateFrom);
      if (form.dateTo) q.set('date_to', form.dateTo);
      const r = await api<{ trips: TripSearchRow[]; total: number }>(`/api/trips?${q.toString()}`);
      setResults(r.trips);
      setTotal(r.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="hero">
        <h1>{t('home.title')}</h1>
        <p>{t('home.subtitle')}</p>
      </div>

      <form className="card search-card" onSubmit={(e) => void search(e)} aria-label={t('home.searchBtn')}>
        <label htmlFor="home-from">
          {t('home.fromLabel')}
          <select
            id="home-from"
            required
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          >
            <option value="">{t('home.fromPlaceholder')}</option>
            {wilayas.map((w) => (
              <option key={w.id} value={w.id}>
                {String(w.id).padStart(2, '0')} · {w.nom_fr}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="home-to">
          {t('home.toLabel')}
          <select id="home-to" required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}>
            <option value="">{t('home.toPlaceholder')}</option>
            {wilayas.map((w) => (
              <option key={w.id} value={w.id} disabled={String(w.id) === form.from}>
                {String(w.id).padStart(2, '0')} · {w.nom_fr}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="home-date-from">
          {t('home.dateFromLabel')}
          <input
            id="home-date-from"
            type="date"
            value={form.dateFrom}
            max={form.dateTo || undefined}
            onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
          />
        </label>
        <label htmlFor="home-date-to">
          {t('home.dateToLabel')}
          <input
            id="home-date-to"
            type="date"
            value={form.dateTo}
            min={form.dateFrom || undefined}
            onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
          />
        </label>
        <button className="btn primary" disabled={busy || !form.from || !form.to || form.from === form.to}>
          {busy ? t('home.searching') : t('home.searchBtn')}
        </button>
      </form>

      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}

      {results !== null && (
        <div className="results">
          <h2 aria-live="polite">{t('home.resultsCount', { count: total, s: total > 1 ? 's' : '' })}</h2>
          {results.length === 0 && <p className="empty">{t('home.noResults')}</p>}
          <div className="grid">
            {results.map((trip) => (
              <Link key={trip.id} to={`/trips/${trip.id}`} className="card trip-card">
                <div className="route">
                  <strong>{trip.from_wilaya}</strong>
                  <span className="arrow" aria-hidden="true">
                    →
                  </span>
                  <strong>{trip.to_wilaya}</strong>
                </div>
                <div className="meta">
                  <span>🕒 {fmtDateTime(trip.departure_at)}</span>
                  <span>🗺️ {trip.trajectory_name}</span>
                </div>
                <div className="foot">
                  <span className="price">
                    {Number(trip.price).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ')} {trip.currency}
                  </span>
                  <span className="seats">{t('home.seatsAvailable', { count: trip.seats_available ?? 0 })}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
