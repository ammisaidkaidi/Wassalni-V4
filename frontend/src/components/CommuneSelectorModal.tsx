import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { useI18n } from '../i18n';
import type { CommuneRow, DairaRow } from '../types';
import { useFocusTrap } from '../useFocusTrap';

interface CommuneSelectorModalProps {
  basePath: '/api/admin' | '/api/driver';
  trajectoryId: string;
  wpointId: string;
  wilayaId: number;
  wilayaNomFr: string;
  wilayaNomAr: string;
  onClose: () => void;
  /** Called only after a successful Confirm (server write). Never called on Cancel. */
  onSaved: (count: number) => void;
}

type DairaState = 'all' | 'partial' | 'none';

/**
 * Modal editor for a single WPoint's Commune selection.
 *
 *   WPoint = { wilaya: READ_ONLY, communes: [] }
 *
 * The Wilaya is fixed and displayed read-only (it can never be changed from
 * here — wilaya_id is immutable on a wpoint once set, enforced server-side
 * by trg_wpoint_guard / DZ206). Daira is only a client-side grouping used to
 * select/deselect its Communes in bulk; it is never sent to or stored by the
 * backend — only the resulting Commune ids are persisted in WPoint.communes.
 *
 * Everything here is local state until "Confirmer" is pressed (one PUT with
 * the final set); "Annuler" just closes the modal and discards every change.
 */
export default function CommuneSelectorModal({
  basePath,
  trajectoryId,
  wpointId,
  wilayaId,
  wilayaNomFr,
  wilayaNomAr,
  onClose,
  onSaved,
}: CommuneSelectorModalProps) {
  const { t } = useI18n();
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);
  const [dairas, setDairas] = useState<DairaRow[]>([]);
  const [communes, setCommunes] = useState<CommuneRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      api<{ dairas: DairaRow[] }>(`/api/registry/wilayas/${wilayaId}/dairas`),
      api<{ communes: CommuneRow[] }>(`/api/registry/wilayas/${wilayaId}/communes`),
      api<{ commune_ids: number[] }>(`${basePath}/trajectories/${trajectoryId}/wpoints/${wpointId}/communes`),
    ])
      .then(([d, c, sel]) => {
        if (cancelled) return;
        setDairas(d.dairas);
        setCommunes(c.communes);
        setSelected(new Set(sel.commune_ids));
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [basePath, trajectoryId, wpointId, wilayaId]);

  // Close on Escape.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const communesByDaira = useMemo(() => {
    const map = new Map<number, CommuneRow[]>();
    for (const c of communes) {
      const list = map.get(c.daira_id);
      if (list) list.push(c);
      else map.set(c.daira_id, [c]);
    }
    return map;
  }, [communes]);

  const dairaState = (dairaId: number): DairaState => {
    const list = communesByDaira.get(dairaId) ?? [];
    if (list.length === 0) return 'none';
    const n = list.filter((c) => selected.has(c.id)).length;
    if (n === 0) return 'none';
    if (n === list.length) return 'all';
    return 'partial';
  };

  const toggleCommune = (id: number): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleDaira = (dairaId: number): void => {
    const list = communesByDaira.get(dairaId) ?? [];
    const state = dairaState(dairaId);
    setSelected((prev) => {
      const next = new Set(prev);
      if (state === 'all') {
        for (const c of list) next.delete(c.id);
      } else {
        for (const c of list) next.add(c.id);
      }
      return next;
    });
  };

  const selectAll = (): void => setSelected(new Set(communes.map((c) => c.id)));
  const deselectAll = (): void => setSelected(new Set());
  const invertSelection = (): void => {
    setSelected((prev) => {
      const next = new Set<number>();
      for (const c of communes) {
        if (!prev.has(c.id)) next.add(c.id);
      }
      return next;
    });
  };

  const removeChip = (id: number): void => toggleCommune(id);

  const selectedCommunes = useMemo(
    () => communes.filter((c) => selected.has(c.id)).sort((a, b) => a.nom_fr.localeCompare(b.nom_fr)),
    [communes, selected],
  );

  const confirm = async (): Promise<void> => {
    setSaving(true);
    setError('');
    try {
      const r = await api<{ ok: true; count: number }>(`${basePath}/trajectories/${trajectoryId}/wpoints/${wpointId}/communes`, {
        method: 'PUT',
        body: { commune_ids: Array.from(selected) },
      });
      onSaved(r.count);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-box wpoint-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t('communeModal.dialogLabel')}
        ref={modalRef}
        tabIndex={-1}
      >
        <div className="modal-head">
          <h2>{t('communeModal.title')}</h2>
          <button type="button" className="btn ghost small modal-x" onClick={onClose} aria-label={t('communeModal.close')}>
            ✕
          </button>
        </div>

        <div className="wpoint-readonly-wilaya">
          <span className="chip-label">{t('communeModal.readonlyWilaya')}</span>
          <strong>{wilayaNomFr}</strong> <span className="muted">({wilayaNomAr})</span>
        </div>

        {error && (
          <p className="alert error small" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="empty">{t('communeModal.loading')}</p>
        ) : (
          <>
            <div className="wpoint-controls">
              <button type="button" className="btn ghost small" onClick={selectAll} disabled={saving}>
                {t('communeModal.selectAll')}
              </button>
              <button type="button" className="btn ghost small" onClick={deselectAll} disabled={saving}>
                {t('communeModal.deselectAll')}
              </button>
              <button type="button" className="btn ghost small" onClick={invertSelection} disabled={saving}>
                {t('communeModal.invertSelection')}
              </button>
              <span className="wpoint-count">
                {t('communeModal.selectedCount', { count: selected.size, s: selected.size > 1 ? 's' : '' })}
              </span>
            </div>

            <div className="wpoint-chips">
              {selectedCommunes.length === 0 && <span className="muted small">{t('communeModal.noneSelected')}</span>}
              {selectedCommunes.map((c) => (
                <span key={c.id} className="chip removable">
                  {c.nom_fr}
                  <button
                    type="button"
                    onClick={() => removeChip(c.id)}
                    aria-label={t('communeModal.remove', { name: c.nom_fr })}
                    disabled={saving}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="wpoint-daira-list">
              {dairas.map((d) => {
                const list = communesByDaira.get(d.id) ?? [];
                const state = dairaState(d.id);
                const selectedInDaira = list.filter((c) => selected.has(c.id)).length;
                return (
                  <details key={d.id} className={`daira-group daira-${state}`} open={state !== 'none'}>
                    <summary>
                      <input
                        type="checkbox"
                        checked={state === 'all'}
                        ref={(el) => {
                          if (el) el.indeterminate = state === 'partial';
                        }}
                        onChange={() => toggleDaira(d.id)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={saving || list.length === 0}
                      />
                      <span className="daira-name">
                        {d.nom_fr} <span className="muted">({d.nom_ar})</span>
                      </span>
                      <span className="daira-tally muted small">
                        {selectedInDaira}/{list.length}
                      </span>
                    </summary>
                    <ul className="commune-list">
                      {list.map((c) => (
                        <li key={c.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={selected.has(c.id)}
                              onChange={() => toggleCommune(c.id)}
                              disabled={saving}
                            />
                            {c.nom_fr} <span className="muted">({c.nom_ar})</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </div>
          </>
        )}

        <div className="modal-foot">
          <button type="button" className="btn ghost" onClick={onClose} disabled={saving}>
            {t('communeModal.cancel')}
          </button>
          <button type="button" className="btn primary" onClick={() => void confirm()} disabled={saving || loading}>
            {saving ? t('communeModal.saving') : t('communeModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
