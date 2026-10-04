import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiError, fmtDateTime } from '../api';
import { useI18n } from '../i18n';
import type { SharedTripInfo } from '../types';

/**
 * Task 11.4 — public, unauthenticated live-trip tracking page. Reachable via
 * the share link a customer/driver generates from their reservation
 * (`/track/:token`). Deliberately shows only status/ETA/position — no
 * names, phone numbers, or price (see get_shared_trip_info() in sql.txt).
 */
export default function ShareTrackingPage() {
  const { t } = useI18n();
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<SharedTripInfo | null>(null);
  const [error, setError] = useState('');

  const statusLabel = (key: string): string => {
    const dict = t(`status.trip.${key}`);
    return dict === `status.trip.${key}` ? key : dict;
  };

  useEffect(() => {
    if (!token) return;
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        const data = await res.json();
        if (!res.ok)
          throw new ApiError(data?.error?.message ?? t('track.genericError'), data?.error?.code ?? 'UNKNOWN', res.status);
        if (!stop) {
          setInfo(data as SharedTripInfo);
          setError('');
        }
      } catch (err) {
        if (!stop) setError(err instanceof Error ? err.message : String(err));
      }
    };
    void load();
    const interval = setInterval(load, 15_000);
    return () => {
      stop = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <section>
      <h1>{t('track.title')}</h1>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {!error && !info && <p className="empty">{t('track.loading')}</p>}
      {info && (
        <div className="card" style={{ maxWidth: 480 }}>
          <p>
            <span className="pill">{statusLabel(info.trip_status)}</span>
          </p>
          <div className="meta">
            <span>{t('track.departure', { date: fmtDateTime(info.departure_at) })}</span>
            {info.arrival_eta && <span>{t('track.estimatedArrival', { date: fmtDateTime(info.arrival_eta) })}</span>}
            <span>{t('track.seatsReserved', { count: info.seats })}</span>
            <span>{t('track.reservationStatus', { status: info.reservation_status })}</span>
          </div>
          {info.driver_location ? (
            <p className="meta">
              {t('track.lastKnownPosition', {
                lat: info.driver_location.lat.toFixed(5),
                lon: info.driver_location.lon.toFixed(5),
                date: fmtDateTime(info.driver_location.recorded_at),
              })}
            </p>
          ) : (
            <p className="empty">{t('track.positionUnavailable')}</p>
          )}
        </div>
      )}
    </section>
  );
}
