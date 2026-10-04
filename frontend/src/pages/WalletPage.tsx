import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDateTime } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import type { ReferralRewardRow, ReferralSummary, WalletEntryRow, WalletEntryType } from '../types';

/** Task 9.3 (wallet) + 9.4 (referral) — customer-facing "Mon portefeuille" screen. */
export default function WalletPage() {
  const { t, lang } = useI18n();
  const { user, loading } = useAuth();
  const [balance, setBalance] = useState<string | null>(null);
  const [history, setHistory] = useState<WalletEntryRow[]>([]);
  const [referral, setReferral] = useState<(ReferralSummary & { rewards: ReferralRewardRow[] }) | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-DZ';
  const entryLabel: Record<WalletEntryType, string> = {
    refund_credit: t('walletEntry.refund_credit'),
    promo_credit: t('walletEntry.promo_credit'),
    referral_credit: t('walletEntry.referral_credit'),
    booking_debit: t('walletEntry.booking_debit'),
    admin_adjustment: t('walletEntry.admin_adjustment'),
  };

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

  if (loading) return <p className="empty">{t('wallet.loading')}</p>;
  if (!user?.customer_id)
    return (
      <p className="empty">
        <Link to="/login?next=/wallet">{t('login.title')}</Link> — {t('wallet.loginToView')}
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
      <h1>{t('wallet.title')}</h1>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t('wallet.balanceCard')}</h2>
        <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
          {balance === null ? '—' : `${Number(balance).toLocaleString(locale)} DZD`}
        </p>
        <p className="muted small">{t('wallet.balanceHint')}</p>
      </div>

      {referral && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t('wallet.referralCard')}</h2>
          <p>
            {t('wallet.yourCode')} <strong style={{ fontSize: '1.2rem' }}>{referral.referral_code}</strong>{' '}
            <button className="btn ghost small" onClick={() => void copyCode()}>
              {copied ? t('wallet.copied') : t('wallet.copy')}
            </button>
          </p>
          <p className="muted small">{t('wallet.referralHint')}</p>
          <div className="meta">
            <span>{t('wallet.totalReferred', { count: referral.total_referred })}</span>
            <span>{t('wallet.totalRewarded', { amount: Number(referral.total_rewarded).toLocaleString(locale) })}</span>
          </div>
          {referral.rewards.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 10 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('wallet.referredCol')}</th>
                    <th>{t('wallet.amountCol')}</th>
                    <th>{t('wallet.statusCol')}</th>
                    <th>{t('wallet.dateCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {referral.rewards.map((rw) => (
                    <tr key={rw.id}>
                      <td>{rw.referred_name ?? t('wallet.notAvailable')}</td>
                      <td>{Number(rw.reward_amount).toLocaleString(locale)} DZD</td>
                      <td>
                        <span className={`chip ${rw.status}`}>
                          {rw.status === 'paid' ? t('wallet.statusPaid') : t('wallet.statusPending')}
                        </span>
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
        <h2 style={{ marginTop: 0 }}>{t('wallet.historyCard')}</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('wallet.typeCol')}</th>
                <th>{t('wallet.amountCol')}</th>
                <th>{t('wallet.descriptionCol')}</th>
                <th>{t('wallet.dateCol')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{entryLabel[h.entry_type]}</td>
                  <td className={Number(h.amount) < 0 ? 'negative' : 'positive'}>
                    {Number(h.amount) > 0 ? '+' : ''}
                    {Number(h.amount).toLocaleString(locale)} DZD
                  </td>
                  <td>{h.description ?? t('wallet.notAvailable')}</td>
                  <td>{fmtDateTime(h.created_at)}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    {t('wallet.noMovements')}
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
