import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDateTime } from '../api';
import type { TripSearchRow, Wilaya } from '../types';

export default function HomePage() {
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [form, setForm] = useState({ from: '', to: '', date: '' });
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
      if (form.date) q.set('date', form.date);
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
        <h1>Voyagez entre les 69 wilayas</h1>
        <p>Recherchez un voyage, réservez vos places, payez en DZD.</p>
      </div>

      <form className="card search-card" onSubmit={(e) => void search(e)}>
        <label>
          Départ
          <select required value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}>
            <option value="">— Wilaya de départ —</option>
            {wilayas.map((w) => (
              <option key={w.id} value={w.id}>
                {String(w.id).padStart(2, '0')} · {w.nom_fr}
              </option>
            ))}
          </select>
        </label>
        <label>
          Arrivée
          <select required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}>
            <option value="">— Wilaya d'arrivée —</option>
            {wilayas.map((w) => (
              <option key={w.id} value={w.id} disabled={String(w.id) === form.from}>
                {String(w.id).padStart(2, '0')} · {w.nom_fr}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <button className="btn primary" disabled={busy || !form.from || !form.to || form.from === form.to}>
          {busy ? 'Recherche…' : 'Rechercher'}
        </button>
      </form>

      {error && <p className="alert error">{error}</p>}

      {results !== null && (
        <div className="results">
          <h2>
            {total} voyage{total > 1 ? 's' : ''} trouvé{total > 1 ? 's' : ''}
          </h2>
          {results.length === 0 && <p className="empty">Aucun voyage pour cette recherche.</p>}
          <div className="grid">
            {results.map((t) => (
              <Link key={t.id} to={`/trips/${t.id}`} className="card trip-card">
                <div className="route">
                  <strong>{t.from_wilaya}</strong>
                  <span className="arrow">→</span>
                  <strong>{t.to_wilaya}</strong>
                </div>
                <div className="meta">
                  <span>🕒 {fmtDateTime(t.departure_at)}</span>
                  <span>🗺️ {t.trajectory_name}</span>
                </div>
                <div className="foot">
                  <span className="price">
                    {Number(t.price).toLocaleString('fr-DZ')} {t.currency}
                  </span>
                  <span className="seats">{t.seats_available ?? 0} place(s) libre(s)</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
