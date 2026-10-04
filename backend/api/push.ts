import webpush from 'web-push';
import type { DomainRepository } from '../DB/domain';
import type { ApiConfig } from './config';

/**
 * Task 16.2 — Web Push dispatch.
 *
 * Every notification-worthy event already lands in the generic `notification`
 * table (Task 11.1) via notify_customer()/notify_driver()/notify_admins() —
 * this module does not duplicate that domain logic. It is purely a delivery
 * side-channel: a periodic sweep (wired into api/server.ts, same
 * unref'd-setInterval pattern as the payment-intent/lifecycle tickers) reads
 * notification rows that haven't been pushed yet, looks up the recipient's
 * registered browser subscriptions, and best-effort delivers one Web Push
 * message per subscription.
 *
 * Delivery is fire-and-forget by design: the in-app notification inbox
 * (GET /api/notifications) is the reliable record, push is just an
 * attention-getter layered on top. A subscription the push service reports
 * as gone (404/410 — the user revoked permission, uninstalled, or cleared
 * storage) is pruned immediately so we stop wasting calls on it.
 */
export function configurePushService(cfg: ApiConfig): void {
  webpush.setVapidDetails(cfg.vapid.subject, cfg.vapid.publicKey, cfg.vapid.privateKey);
}

export async function dispatchPendingPushNotifications(repo: DomainRepository): Promise<{ sent: number; pruned: number; notifications: number }> {
  const pending = await repo.listUnpushedNotifications(200);
  if (pending.length === 0) return { sent: 0, pruned: 0, notifications: 0 };

  const recipientIds = pending.map((n) => n.recipient_user_id).filter((id): id is string => !!id);
  const subscriptions = await repo.getPushSubscriptionsForUsers(recipientIds);
  const byUser = new Map<string, typeof subscriptions>();
  for (const sub of subscriptions) {
    const list = byUser.get(sub.user_id) ?? [];
    list.push(sub);
    byUser.set(sub.user_id, list);
  }

  let sent = 0;
  let pruned = 0;
  for (const n of pending) {
    const subs = n.recipient_user_id ? (byUser.get(n.recipient_user_id) ?? []) : [];
    const payload = JSON.stringify({ title: n.title, body: n.body, url: (n.data as { url?: string })?.url ?? '/', tag: n.type });
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
          sent += 1;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await repo.deletePushSubscriptionsByEndpointAny(sub.endpoint);
            pruned += 1;
          } else {
            console.error(`✗ web-push send failed (user ${sub.user_id}):`, err instanceof Error ? err.message : err);
          }
        }
      }),
    );
  }

  await repo.markNotificationsPushed(pending.map((n) => n.id));
  return { sent, pruned, notifications: pending.length };
}
