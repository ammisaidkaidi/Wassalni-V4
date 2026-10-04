import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { EmergencyContactsCard, FavoritesCard, WaitlistCard } from '../components/CustomerExtras';
import type { CommuneRow, CustomerProfileRow, Wilaya } from '../types';

interface ProfileForm {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  nin: string;
  nif: string;
  home_wilaya_id: string;
  home_commune_id: string;
  gps_lat: string;
  gps_lon: string;
}

const EMPTY_FORM: ProfileForm = {
  full_name: '',
  phone: '',
  email: '',
  address: '',
  nin: '',
  nif: '',
  home_wilaya_id: '',
  home_commune_id: '',
  gps_lat: '',
  gps_lon: '',
};

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<CustomerProfileRow | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [communes, setCommunes] = useState<CommuneRow[]>([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, w] = await Promise.all([
        api<{ customer: CustomerProfileRow }>('/api/customer/me'),
        api<{ wilayas: Wilaya[] }>('/api/registry/wilayas'),
      ]);
      setProfile(p.customer);
      setWilayas(w.wilayas);
      setForm({
        full_name: p.customer.full_name,
        phone: p.customer.phone,
        email: p.customer.email ?? '',
        address: p.customer.address ?? '',
        nin: p.customer.nin ?? '',
        nif: p.customer.nif ?? '',
        home_wilaya_id: p.customer.home_wilaya_id != null ? String(p.customer.home_wilaya_id) : '',
        home_commune_id: p.customer.home_commune_id != null ? String(p.customer.home_commune_id) : '',
        gps_lat: p.customer.gps_lat ?? '',
        gps_lon: p.customer.gps_lon ?? '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  // Reload the commune list whenever the chosen home wilaya changes, and
  // drop any previously-selected commune that no longer belongs to it.
  useEffect(() => {
    if (!form.home_wilaya_id) {
      setCommunes([]);
      return;
    }
    let cancelled = false;
    api<{ communes: CommuneRow[] }>(`/api/registry/wilayas/${form.home_wilaya_id}/communes`)
      .then((r) => {
        if (cancelled) return;
        setCommunes(r.communes);
        setForm((f) =>
          f.home_commune_id && !r.communes.some((c) => String(c.id) === f.home_commune_id)
            ? { ...f, home_commune_id: '' }
            : f,
        );
      })
      .catch(() => {
        if (!cancelled) setCommunes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.home_wilaya_id]);

  const wilayaName = useMemo(() => {
    const m = new Map(wilayas.map((w) => [w.id, w.nom_fr] as const));
    return (id: number | null) => (id != null ? m.get(id) ?? `#${id}` : '—');
  }, [wilayas]);

  const useCurrentLocation = (): void => {
    if (!('geolocation' in navigator)) {
      setError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          gps_lat: pos.coords.latitude.toFixed(6),
          gps_lon: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      (err) => {
        setError(`Position indisponible : ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const save = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setMsg('');
    setError('');
    setSaving(true);
    try {
      const r = await api<{ customer: CustomerProfileRow }>('/api/customer/me', {
        method: 'PUT',
        body: {
          full_name: form.full_name,
          phone: form.phone,
          email: form.email || null,
          address: form.address || null,
          nin: form.nin || null,
          nif: form.nif || null,
          home_wilaya_id: form.home_wilaya_id ? Number(form.home_wilaya_id) : null,
          home_commune_id: form.home_commune_id ? Number(form.home_commune_id) : null,
          gps_lat: form.gps_lat !== '' ? Number(form.gps_lat) : null,
          gps_lon: form.gps_lon !== '' ? Number(form.gps_lon) : null,
        },
      });
      setProfile(r.customer);
      setMsg('✔ Profil mis à jour');
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <p className="empty">Chargement…</p>;
  if (!user || !user.customer_id)
    return (
      <p className="empty">
        <Link to="/login?next=/profile">Connectez-vous</Link> pour gérer votre profil.
      </p>
    );
  if (!profile) return error ? <p className="alert error">{error}</p> : <p className="empty">Chargement…</p>;

  return (
    <section>
      <h1>Mon profil</h1>
      {msg && <p className="alert success">{msg}</p>}
      {error && <p className="alert error">{error}</p>}

      <div className="detail-grid">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Identité &amp; coordonnées</h2>
          <p className="muted small">
            Membre depuis {new Date(profile.created_at).toLocaleDateString('fr-DZ')} — wilaya actuelle :{' '}
            {wilayaName(profile.home_wilaya_id)}.
          </p>
          <form className="form-grid" onSubmit={(e) => void save(e)}>
            <label>
              Nom complet
              <input
                required
                minLength={2}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </label>
            <label>
              Téléphone
              <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              Adresse
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <label>
              NIN (18 chiffres)
              <input
                value={form.nin}
                maxLength={18}
                placeholder="optionnel"
                onChange={(e) => setForm({ ...form, nin: e.target.value.replace(/\D/g, '') })}
              />
            </label>
            <label>
              NIF (20 chiffres)
              <input
                value={form.nif}
                maxLength={20}
                placeholder="optionnel"
                onChange={(e) => setForm({ ...form, nif: e.target.value.replace(/\D/g, '') })}
              />
            </label>

            <label>
              Wilaya de résidence
              <select
                value={form.home_wilaya_id}
                onChange={(e) => setForm({ ...form, home_wilaya_id: e.target.value, home_commune_id: '' })}
              >
                <option value="">— non renseignée —</option>
                {wilayas.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.nom_fr}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Commune de résidence
              <select
                value={form.home_commune_id}
                disabled={!form.home_wilaya_id}
                onChange={(e) => setForm({ ...form, home_commune_id: e.target.value })}
              >
                <option value="">— non renseignée —</option>
                {communes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom_fr}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Position GPS (latitude)
              <input
                type="number"
                step="0.000001"
                value={form.gps_lat}
                onChange={(e) => setForm({ ...form, gps_lat: e.target.value })}
              />
            </label>
            <label>
              Position GPS (longitude)
              <input
                type="number"
                step="0.000001"
                value={form.gps_lon}
                onChange={(e) => setForm({ ...form, gps_lon: e.target.value })}
              />
            </label>
            <div>
              <button type="button" className="btn ghost small" disabled={locating} onClick={useCurrentLocation}>
                {locating ? 'Localisation…' : '📍 Utiliser ma position actuelle'}
              </button>
            </div>

            <button className="btn primary" disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        </div>

        <EmergencyContactsCard />
        <FavoritesCard />
        <WaitlistCard />
      </div>
    </section>
  );
}
