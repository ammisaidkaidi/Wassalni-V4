import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, api, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import TripMap, { type MapPin, type MapStop } from '../components/TripMap';
import type { CommuneRow, TripDetail, Wilaya } from '../types';

type PickMode = 'pickup' | 'dropoff';

function stops_wilaya(data: TripDetail | null, wpointId: string): number | undefined {
  return data?.stops.find((s) => s.id === wpointId)?.wilaya_id;
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<TripDetail | null>(null);
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const [showMap, setShowMap] = useState(false);
  const [pickMode, setPickMode] = useState<PickMode>('pickup');
  const [pickupPos, setPickupPos] = useState<{ lat: number; lon: number } | null>(null);
  const [dropoffPos, setDropoffPos] = useState<{ lat: number; lon: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState('');
  // Remaining capacity for exactly the chosen pickup->dropoff segment (Task
  // 2.3) — the trip's flat seats_available is only a whole-route bottleneck
  // and can understate what's really free on a shorter segment.
  const [segmentSeats, setSegmentSeats] = useState<number | null>(null);

  // Task 4.1 — optional precise Commune within the chosen pickup/dropoff
  // stop. Scoped to exactly what that stop actually serves (the admin's
  // curated wpoint_commune subset when one is configured, otherwise every
  // commune of the stop's wilaya) so the customer can't pick a commune the
  // server would reject anyway.
  const [pickupCommuneId, setPickupCommuneId] = useState('');
  const [dropoffCommuneId, setDropoffCommuneId] = useState('');
  const [pickupCommunes, setPickupCommunes] = useState<CommuneRow[]>([]);
  const [dropoffCommunes, setDropoffCommunes] = useState<CommuneRow[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([api<TripDetail>(`/api/trips/${id}`), api<{ wilayas: Wilaya[] }>('/api/registry/wilayas')])
      .then(([d, w]) => {
        setData(d);
        setWilayas(w.wilayas);
        setPickup(d.stops[0]?.id ?? '');
        setDropoff(d.stops[d.stops.length - 1]?.id ?? '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  // Picking different stops invalidates any exact pin placed for that side —
  // the pin must stay consistent with the chosen wilaya-level stop.
  useEffect(() => setPickupPos(null), [pickup]);
  useEffect(() => setDropoffPos(null), [dropoff]);
  useEffect(() => setPickupCommuneId(''), [pickup]);
  useEffect(() => setDropoffCommuneId(''), [dropoff]);

  // Resolve the set of Communes this particular stop actually serves (Task
  // 4.1): fetch the curated wpoint_commune subset; if it's empty (no
  // restriction configured — same convention as the admin WPoint editor),
  // fall back to every commune of the stop's wilaya instead.
  const loadStopCommunes = (
    wpointId: string,
    wilayaId: number | undefined,
    setCommunes: (c: CommuneRow[]) => void,
  ): (() => void) => {
    let cancelled = false;
    if (!id || !wpointId || !wilayaId) {
      setCommunes([]);
      return () => undefined;
    }
    Promise.all([
      api<{ commune_ids: number[] }>(`/api/trips/${id}/wpoints/${wpointId}/communes`),
      api<{ communes: CommuneRow[] }>(`/api/registry/wilayas/${wilayaId}/communes`),
    ])
      .then(([restricted, all]) => {
        if (cancelled) return;
        setCommunes(restricted.commune_ids.length > 0 ? all.communes.filter((c) => restricted.commune_ids.includes(c.id)) : all.communes);
      })
      .catch(() => {
        if (!cancelled) setCommunes([]);
      });
    return () => {
      cancelled = true;
    };
  };

  useEffect(() => loadStopCommunes(pickup, stops_wilaya(data, pickup), setPickupCommunes), [id, pickup, data]);
  useEffect(() => loadStopCommunes(dropoff, stops_wilaya(data, dropoff), setDropoffCommunes), [id, dropoff, data]);

  useEffect(() => {
    if (!id || !pickup || !dropoff) {
      setSegmentSeats(null);
      return;
    }
    let cancelled = false;
    api<{ seats_available: number | null }>(
      `/api/trips/${id}/availability?from_wpoint_id=${pickup}&to_wpoint_id=${dropoff}`,
    )
      .then((r) => {
        if (!cancelled) setSegmentSeats(r.seats_available);
      })
      .catch(() => {
        if (!cancelled) setSegmentSeats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, pickup, dropoff]);

  const pricePair = useMemo(
    () => data?.prices.find((p) => p.from_wpoint_id === pickup && p.to_wpoint_id === dropoff) ?? null,
    [data, pickup, dropoff],
  );
  const total = pricePair ? Number(pricePair.price) * seats : null;
  const maxSeats = Math.min(30, segmentSeats ?? data?.trip.seats_available ?? 30);

  // Keep the seat-count input in range if the segment's capacity shrinks
  // below whatever the customer already had selected.
  useEffect(() => {
    setSeats((s) => Math.max(1, Math.min(s, Math.max(maxSeats, 1))));
  }, [maxSeats]);

  const wilayaCoords = useMemo(() => {
    const m = new Map<number, { lat: number; lon: number }>();
    for (const w of wilayas) if (w.lat != null && w.lon != null) m.set(w.id, { lat: w.lat, lon: w.lon });
    return m;
  }, [wilayas]);

  const mapStops: MapStop[] = useMemo(() => {
    if (!data) return [];
    return data.stops
      .map((s) => {
        const c = wilayaCoords.get(s.wilaya_id);
        return c ? { id: s.id, label: s.nom_fr, lat: c.lat, lon: c.lon } : null;
      })
      .filter((s): s is MapStop => s !== null);
  }, [data, wilayaCoords]);

  const pickedMarkers: MapPin[] = useMemo(() => {
    const pins: MapPin[] = [];
    if (pickupPos) pins.push({ id: 'pickup', label: 'Montée (choisie)', lat: pickupPos.lat, lon: pickupPos.lon, color: '#16a34a' });
    if (dropoffPos) pins.push({ id: 'dropoff', label: 'Descente (choisie)', lat: dropoffPos.lat, lon: dropoffPos.lon, color: '#dc2626' });
    return pins;
  }, [pickupPos, dropoffPos]);

  const onMapPick = (lat: number, lon: number): void => {
    if (pickMode === 'pickup') setPickupPos({ lat, lon });
    else setDropoffPos({ lat, lon });
  };

  // Task 4.1 — "use my current position" as the primary way to set an exact
  // pin, with the existing click-on-map picker (above) as the explicit
  // manual fallback whenever geolocation is denied, unavailable, or just
  // not precise enough for the customer's liking.
  const locateMe = (): void => {
    setGeoMsg('');
    if (!('geolocation' in navigator)) {
      setGeoMsg("Votre navigateur ne permet pas la géolocalisation — placez votre point manuellement sur la carte ci-dessous.");
      setShowMap(true);
      return;
    }
    setGeoMsg('Localisation en cours…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onMapPick(pos.coords.latitude, pos.coords.longitude);
        setShowMap(true);
        setGeoMsg('✔ Position détectée — ajustez-la sur la carte si besoin.');
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        setGeoMsg(
          denied
            ? "Accès à la position refusé — placez votre point manuellement sur la carte ci-dessous."
            : "Impossible de déterminer votre position — placez votre point manuellement sur la carte ci-dessous.",
        );
        setShowMap(true);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const book = async (): Promise<void> => {
    if (!user) {
      navigate(`/login?next=/trips/${id}`);
      return;
    }
    setError('');
    try {
      await api('/api/reservations', {
        method: 'POST',
        body: {
          trip_id: id,
          seats,
          pickup_wpoint_id: pickup,
          dropoff_wpoint_id: dropoff,
          pickup_lat: pickupPos?.lat ?? null,
          pickup_lon: pickupPos?.lon ?? null,
          dropoff_lat: dropoffPos?.lat ?? null,
          dropoff_lon: dropoffPos?.lon ?? null,
          pickup_commune_id: pickupCommuneId ? Number(pickupCommuneId) : null,
          dropoff_commune_id: dropoffCommuneId ? Number(dropoffCommuneId) : null,
        },
      });
      setDone('✔ Réservation confirmée — retrouvez-la dans « Mes réservations »');
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        navigate(`/login?next=/trips/${id}`);
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (error) return <p className="alert error">{error}</p>;
  if (!data) return <p className="empty">Chargement…</p>;
  const { trip, stops } = data;

  return (
    <section className="detail">
      <h1>
        {trip.trajectory_name} <span className="chip">{trip.code}</span>
      </h1>
      <p className="meta">
        🕒 Départ {fmtDateTime(trip.departure_at)} · Arrivée {fmtDateTime(trip.arrival_eta)} · 🧑‍✈️{' '}
        {trip.driver_name ?? '—'} · 🚐 {trip.vehicle_matricule ?? '—'}
      </p>

      <div className="detail-grid">
        <div className="card">
          <h2>Itinéraire</h2>
          <ol className="stops">
            {stops.map((s) => (
              <li key={s.id} className={s.id === pickup ? 'stop from' : s.id === dropoff ? 'stop to' : ''}>
                <span className="dot" />
                <div>
                  <strong>{s.nom_fr}</strong> <span className="muted">({s.nom_ar})</span>
                  <div className="muted">{fmtDateTime(s.eta)}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="card booking">
          <h2>Réserver</h2>
          <label>
            Montée
            <select value={pickup} onChange={(e) => setPickup(e.target.value)}>
              {stops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom_fr}
                </option>
              ))}
            </select>
          </label>
          <label>
            Descente
            <select value={dropoff} onChange={(e) => setDropoff(e.target.value)}>
              {stops.map((s) => (
                <option key={s.id} value={s.id} disabled={s.id === pickup}>
                  {s.nom_fr}
                </option>
              ))}
            </select>
          </label>
          <label>
            Commune de montée <span className="muted small">(optionnel)</span>
            <select value={pickupCommuneId} onChange={(e) => setPickupCommuneId(e.target.value)}>
              <option value="">Peu importe la commune</option>
              {pickupCommunes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom_fr}
                </option>
              ))}
            </select>
          </label>
          <label>
            Commune de descente <span className="muted small">(optionnel)</span>
            <select value={dropoffCommuneId} onChange={(e) => setDropoffCommuneId(e.target.value)}>
              <option value="">Peu importe la commune</option>
              {dropoffCommunes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom_fr}
                </option>
              ))}
            </select>
          </label>
          <label>
            Places
            <input
              type="number"
              min={1}
              max={maxSeats}
              value={seats}
              onChange={(e) => setSeats(Math.max(1, Math.min(maxSeats, Number(e.target.value) || 1)))}
            />
          </label>

          <div className="form-inline" style={{ marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <button type="button" className="btn ghost small" onClick={locateMe}>
              📍 Utiliser ma position actuelle
            </button>
            <button type="button" className="btn ghost small" onClick={() => setShowMap((v) => !v)}>
              {showMap ? 'Masquer la carte' : 'Choisir ma position sur la carte'}
            </button>
          </div>
          {geoMsg && <p className="muted small" style={{ marginTop: -4, marginBottom: 8 }}>{geoMsg}</p>}

          {showMap && (
            <div style={{ marginBottom: 12 }}>
              <div className="form-inline" style={{ marginBottom: 8 }}>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="pickmode" checked={pickMode === 'pickup'} onChange={() => setPickMode('pickup')} />
                  Placer le point de montée
                </label>
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <input type="radio" name="pickmode" checked={pickMode === 'dropoff'} onChange={() => setPickMode('dropoff')} />
                  Placer le point de descente
                </label>
              </div>
              <p className="muted small">
                Cliquez sur la carte pour indiquer précisément où le chauffeur doit vous prendre / déposer, dans la
                wilaya choisie ci-dessus. Facultatif — sans clic, le chauffeur verra une position approximative (centre
                de la wilaya).
              </p>
              <TripMap stops={mapStops} pickedMarkers={pickedMarkers} onPick={onMapPick} height={320} />
            </div>
          )}

          <div className="total">
            {pricePair ? (
              <>
                <span>
                  {Number(pricePair.price).toLocaleString('fr-DZ')} {pricePair.currency} × {seats}
                </span>
                <strong>
                  {total?.toLocaleString('fr-DZ')} {pricePair.currency}
                </strong>
              </>
            ) : (
              <span className="muted">Aucun tarif pour ce trajet — choisissez d'autres arrêts.</span>
            )}
          </div>
          {done ? (
            <p className="alert success">{done}</p>
          ) : (
            <button className="btn primary wide" disabled={!pricePair || maxSeats < 1} onClick={() => void book()}>
              {user ? 'Réserver' : 'Se connecter pour réserver'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
