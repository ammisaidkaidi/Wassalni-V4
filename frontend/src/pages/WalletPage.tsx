import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import type { ReferralRewardRow, ReferralSummary, WalletEntryRow, WalletEntryType } from '../types';

const ENTRY_LABEL: Record<WalletEntryType, string> = {
  refund_credit: 'Remboursement',
  promo_credit: 'Code promo',
  referral_credit: 'Parrainage',
  booking_debit: 'Paiement réservation',
  admin_adjustment: 'Ajustement admin',
};

/** Task 9.3 (wallet) + 9.4 (referral) — customer-facing "Mon portefeuille" screen. */
export default function WalletPage() {
  const { user, loading } = useAuth();
  const [balance, setBalance] = useState<string | null>(null);
  const [history, setHistory] = useState<WalletEntryRow[]>([]);
  const [referral, setReferral] = useState<(ReferralSummary & { rewards: ReferralRewardRow[] }) | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const [w, r] = await Promise.all([
        api<{ balance: string; history: WalletEntryRow[] }>('/api/customer/wallet'),
        api<ReferralSummary & { rewards: ReferralRewardRow[] }>('/api/customer/referral'),
      ]);
      setBalance(w.balance);
      setHistory(w.history);
      setReferral(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (!loading && user) void load();
  }, [loading, user, load]);

  if (loading) return <p className="empty">Chargement…</p>;
  if (!user?.customer_id)
    return (
      <p className="empty">
        <Link to="/login?next=/wallet">Connectez-vous</Link> pour voir votre portefeuille.
      </p>
    );

  const copyCode = async (): Promise<void> => {
    if (!referral) return;
    try {
      await navigator.clipboard.writeText(referral.referral_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the code is still shown on screen, nothing to do.
    }
  };

  return (
    <section>
      <h1>Mon portefeuille</h1>
      {error && <p className="alert error">{error}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Solde</h2>
        <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
          {balance === null ? '—' : `${Number(balance).toLocaleString('fr-DZ')} DZD`}
        </p>
        <p className="muted small">
          Créditez votre portefeuille via un remboursement, un code promo, ou le parrainage — utilisable pour payer
          une réservation (bouton « Payer avec le portefeuille » sur Mes réservations).
        </p>
      </div>

      {referral && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Parrainage</h2>
          <p>
            Votre code : <strong style={{ fontSize: '1.2rem' }}>{referral.referral_code}</strong>{' '}
            <button className="btn ghost small" onClick={() => void copyCode()}>
              {copied ? '✔ Copié' : 'Copier'}
            </button>
          </p>
          <p className="muted small">
            Partagez ce code — vous recevrez un crédit dès que la personne parrainée termine son premier voyage.
          </p>
          <div className="meta">
            <span>👥 {referral.total_referred} personne(s) parrainée(s)</span>
            <span>💰 {Number(referral.total_rewarded).toLocaleString('fr-DZ')} DZD reçu(s)</span>
          </div>
          {referral.rewards.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Filleul</th>
                    <th>Montant</th>
                    <th>Statut</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {referral.rewards.map((rw) => (
                    <tr key={rw.id}>
                      <td>{rw.referred_name ?? '—'}</td>
                      <td>{Number(rw.reward_amount).toLocaleString('fr-DZ')} DZD</td>
                      <td>
                        <span className={`chip ${rw.status}`}>{rw.status === 'paid' ? 'crédité' : 'en attente'}</span>
                      </td>
                      <td>{fmtDateTime(rw.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Historique</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Montant</th>
                <th>Description</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{ENTRY_LABEL[h.entry_type]}</td>
                  <td className={Number(h.amount) < 0 ? 'negative' : 'positive'}>
                    {Number(h.amount) > 0 ? '+' : ''}
                    {Number(h.amount).toLocaleString('fr-DZ')} DZD
                  </td>
                  <td>{h.description ?? '—'}</td>
                  <td>{fmtDateTime(h.created_at)}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    Aucun mouvement pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
