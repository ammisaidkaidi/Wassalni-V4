import type { DBHelper } from '../DB/DBHelper';
import type { DomainRepository } from '../DB/domain';
import { recordSmsLog, type SmsSender } from './sms';

/**
 * Task 17.1 — SMS notifications for booking, approval, cancellation,
 * reminders and payment events, as a second delivery channel layered on
 * the exact same `notification` rows Task 11.1 (and the Task 16.2 push
 * dispatcher) already consume — see DomainRepository.listUnsmsedNotifications.
 * Only this allow-list of event types gets an SMS; everything else
 * (messaging, SOS-to-admin, favourites, …) stays in-app/push-only by design.
 */
const SMS_NOTIFICATION_TYPES = [
  'booking_request',
  'reservation_approved',
  'reservation_rejected',
  'reservation_cancelled',
  'trip_cancelled',
  'trip_reminder',
  'payment_confirmed',
  'payment_expired',
];

export async function dispatchPendingSmsNotifications(
  repo: DomainRepository,
  db: DBHelper,
  smsSender: SmsSender,
): Promise<{ sent: number; failed: number; skippedNoPhone: number; notifications: number }> {
  const pending = await repo.listUnsmsedNotifications(SMS_NOTIFICATION_TYPES, 200);
  if (pending.length === 0) return { sent: 0, failed: 0, skippedNoPhone: 0, notifications: 0 };

  let sent = 0;
  let failed = 0;
  let skippedNoPhone = 0;
  for (const n of pending) {
    if (!n.phone) {
      skippedNoPhone += 1;
      continue;
    }
    const message = `Wassalni — ${n.title} : ${n.body}`.slice(0, 480);
    try {
      const result = await smsSender.sendSms(n.phone, message);
      await recordSmsLog(db, {
        userId: n.recipient_user_id,
        phone: n.phone,
        purpose: 'notification',
        notificationId: n.id,
        message,
        status: result.ok ? 'sent' : 'failed',
        providerMessageId: result.providerMessageId ?? null,
        error: result.error ?? null,
      });
      if (result.ok) sent += 1;
      else failed += 1;
    } catch (err) {
      failed += 1;
      await recordSmsLog(db, {
        userId: n.recipient_user_id,
        phone: n.phone,
        purpose: 'notification',
        notificationId: n.id,
        message,
        status: 'failed',
        providerMessageId: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Marked attempted regardless of outcome — same best-effort, no-infinite-
  // retry posture as the push dispatcher (Task 16.2): the in-app
  // notification remains the reliable record either way.
  await repo.markNotificationsSmsSent(pending.map((n) => n.id));
  return { sent, failed, skippedNoPhone, notifications: pending.length };
}
