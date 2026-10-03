import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError, api } from '../api';
import type { Wilaya, WpointRow } from '../types';

interface WpointRecord {
  wilaya: string;
  communes: string[];
}

interface WpointManagerProps {
  /** Which backend area owns the trajectory: admin can manage any, driver only their own. */
  basePath: '/api/admin' | '/api/driver';
  trajectoryId: string;
  wilayas: Wilaya[];
  /** Notified every time the stop list changes, so the parent can refresh price-selector options etc. */
  onWpointsChange?: (wpoints: WpointRow[]) => void;
}

/**
 * Shared stop-list ("WPoint") editor used by both the Admin and Driver
 * trajectory tabs. Respects the deployed WPoint rules:
 *  - one wpoint per wilaya per trajectory (UNIQUE(trajectory_id, wilaya_id) —
 *    the backend's add_wpoint() merges instead of duplicating, so adding an
 *    already-present wilaya just re-selects it, never errors);
 *  - position is a dense 1..N ranking — reordering always resends the
 *    *entire* current id list so the result stays contiguous;
 *  - wilaya_id/trajectory_id are immutable once set (trg_wpoint_guard /
 *    DZ206) — this UI never attempts to change them, only position and the
 *    attached communes;
 *  - deleting a stop already used by an existing trip is blocked server-side
 *    (409 WPOINT_IN_USE) since trip_stop → wpoint cascades at the DB level;
 *    we just surface that error clearly instead of attempting to work around it.
 */
export default function WpointManager({ basePath, trajectoryId, wilayas, onWpointsChange }: WpointManagerProps) {
  const [wpoints, setWpoints] = useState<WpointRow[]>([]);
  const [wilayaId, setWilayaId] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openWpoint, setOpenWpoint] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, WpointRecord>>({});
  const [refine, setRefine] = useState({ commune: '', daira: '' });

  const onWpointsChangeRef = useRef(onWpointsChange);
  onWpointsChangeRef.current = onWpointsChange;

  const load = useCallback(async () => {
    if (!trajectoryId) {
      setWpoints([]);
      onWpointsChangeRef.current?.([]);
      return;
    }
    const r = await api<{ wpoints: WpointRow[] }>(`${basePath}/trajectories/${trajectoryId}/wpoints`);
    setWpoints(r.wpoints);
    onWpointsChangeRef.current?.(r.wpoints);
  }, [basePath, trajectoryId]);

  useEffect(() => {
    setMsg('');
    setError('');
    setOpenWpoint(null);
    setRecords({});
    load().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [load]);

  const addWpoint = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api(`${basePath}/trajectories/${trajectoryId}/wpoints`, { method: 'POST', body: { wilaya_id: Number(wilayaId) } });
      setWilayaId('');
      setMsg('✔ Arrêt ajouté');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const toggleWpoint = async (wpointId: string): Promise<void> => {
    if (openWpoint === wpointId) {
      setOpenWpoint(null);
      return;
    }
    setOpenWpoint(wpointId);
    setRefine({ commune: '', daira: '' });
    setError('');
    try {
      const r = await api<{ wpoint: WpointRecord }>(`${basePath}/trajectories/${trajectoryId}/wpoints/${wpointId}/record`);
      setRecords((prev) => ({ ...prev, [wpointId]: r.wpoint }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const reloadRecord = async (wpointId: string): Promise<void> => {
    const r = await api<{ wpoint: WpointRecord }>(`${basePath}/trajectories/${trajectoryId}/wpoints/${wpointId}/record`);
    setRecords((prev) => ({ ...prev, [wpointId]: r.wpoint }));
  };

  const addCommune = async (wpointId: string): Promise<void> => {
    setError('');
    setMsg('');
    try {
      await api(`${basePath}/trajectories/${trajectoryId}/wpoints/${wpointId}/commune`, {
        method: 'POST',
        body: { commune: refine.commune },
      });
      setRefine({ ...refine, commune: '' });
      await reloadRecord(wpointId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const addDaira = async (wpointId: string): Promise<void> => {
    setError('');
    setMsg('');
    try {
      const r = await api<{ added: number }>(`${basePath}/trajectories/${trajectoryId}/wpoints/${wpointId}/daira`, {
        method: 'POST',
        body: { daira: refine.daira },
      });
      setMsg(`✔ ${r.added} commune(s) de la daïra ajoutée(s)`);
      setRefine({ ...refine, daira: '' });
      await reloadRecord(wpointId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const move = async (index: number, dir: -1 | 1): Promise<void> => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= wpoints.length || busy) return;
    const ids = wpoints.map((w) => w.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(newIndex, 0, moved);
    setError('');
    setMsg('');
    setBusy(true);
    try {
      await api(`${basePath}/trajectories/${trajectoryId}/wpoints/reorder`, { method: 'POST', body: { ids } });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (wpointId: string, label: string): Promise<void> => {
    setError('');
    setMsg('');
    if (!window.confirm(`Supprimer l'arrêt « ${label} » de cette trajectoire ?`)) return;
    try {
      await api(`${basePath}/trajectories/${trajectoryId}/wpoints/${wpointId}`, { method: 'DELETE' });
      setMsg('✔ Arrêt supprimé');
      if (openWpoint === wpointId) setOpenWpoint(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'WPOINT_IN_USE') {
        setError("Impossible de supprimer : cet arrêt est utilisé par au moins un voyage existant.");
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
  };

  return (
    <div className="wpoint-manager">
      {msg && <p className="alert success small">{msg}</p>}
      {error && <p className="alert error small">{error}</p>}
      <ol className="stops">
        {wpoints.map((w, index) => (
          <li key={w.id} className="wpoint-item">
            <span className="dot" />
            <div className="wpoint-body">
              <div className="wpoint-head">
                <strong>
                  {w.position}. {w.nom_fr}
                </strong>{' '}
                <span className="muted">({w.nom_ar})</span>
                <button
                  type="button"
                  className="btn ghost small"
                  title="Monter"
                  disabled={index === 0 || busy}
                  onClick={() => void move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  title="Descendre"
                  disabled={index === wpoints.length - 1 || busy}
                  onClick={() => void move(index, 1)}
                >
                  ↓
                </button>
                <button type="button" className="btn ghost small" onClick={() => void toggleWpoint(w.id)}>
                  {openWpoint === w.id ? 'Masquer' : 'Affiner (communes)'}
                </button>
                <button type="button" className="btn danger small" onClick={() => void remove(w.id, w.nom_fr)}>
                  Supprimer
                </button>
              </div>
              {openWpoint === w.id && (
                <div className="wpoint-refine">
                  <p className="muted small">
                    Communes sélectionnées :{' '}
                    {records[w.id]?.communes.length ? records[w.id].communes.join(', ') : 'toute la wilaya (aucune restriction)'}
                  </p>
                  <div className="form-inline">
                    <input
                      placeholder="Nom de commune"
                      value={refine.commune}
                      onChange={(e) => setRefine({ ...refine, commune: e.target.value })}
                    />
                    <button type="button" className="btn ghost small" onClick={() => void addCommune(w.id)} disabled={!refine.commune.trim()}>
                      + Commune
                    </button>
                  </div>
                  <div className="form-inline">
                    <input
                      placeholder="Nom de daïra (ajoute toutes ses communes)"
                      value={refine.daira}
                      onChange={(e) => setRefine({ ...refine, daira: e.target.value })}
                    />
                    <button type="button" className="btn ghost small" onClick={() => void addDaira(w.id)} disabled={!refine.daira.trim()}>
                      + Daïra
                    </button>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <form className="form-inline" onSubmit={(e) => void addWpoint(e)}>
        <label>
          Ajouter un arrêt
          <select required value={wilayaId} onChange={(e) => setWilayaId(e.target.value)}>
            <option value="">— Wilaya —</option>
            {wilayas.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nom_fr}
              </option>
            ))}
          </select>
        </label>
        <button className="btn primary">Ajouter</button>
      </form>
    </div>
  );
}
