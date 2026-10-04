import { Router } from 'express';
import type { DomainRepository } from '../../DB/domain';
import type { ApiConfig } from '../config';
import { wrap } from '../middleware/errors';
import { requireAuth } from '../middleware/session';
import { DomainValidationError } from '../../DB/domain';

interface SubscriptionPayload {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}

function parseSubscription(body: unknown): { endpoint: string; p256dh: string; auth: string } {
  const sub = (body as { subscription?: SubscriptionPayload } | undefined)?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('http')) {
    throw new DomainValidationError('BAD_PUSH_SUBSCRIPTION', 'Abonnement push invalide (endpoint manquant)');
  }
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !p256dh || !auth) {
    throw new DomainValidationError('BAD_PUSH_SUBSCRIPTION', 'Abonnement push invalide (clés manquantes)');
  }
  return { endpoint, p256dh, auth };
}

/**
 * Task 16.2 — Web Push subscription management, available to every signed-in
 * role (customer/driver/admin) the same way the notification inbox is:
 * gated only by requireAuth, not by a specific role.
 */
export function pushRoutes(repo: DomainRepository, cfg: ApiConfig): Router {
  const router = Router();

  // Public: the browser needs this to call pushManager.subscribe() *before*
  // it has necessarily finished signing in in some flows, so it is not
  // behind requireAuth. It is not a secret — it is the whole point of the
  // "public" half of the VAPID keypair.
  router.get('/vapid-public-key', (_req, res) => {
    res.json({ publicKey: cfg.vapid.publicKey });
  });

  router.use(requireAuth);

  router.post(
    '/subscribe',
    wrap(async (req, res) => {
      const { endpoint, p256dh, auth } = parseSubscription(req.body);
      const userAgent = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 300) : null;
      const row = await repo.savePushSubscription(req.user!.id, endpoint, p256dh, auth, userAgent);
      res.status(201).json({ subscription: row });
    }),
  );

  router.post(
    '/unsubscribe',
    wrap(async (req, res) => {
      const endpoint = (req.body as { endpoint?: unknown } | undefined)?.endpoint;
      if (typeof endpoint !== 'string' || !endpoint) {
        throw new DomainValidationError('BAD_PUSH_SUBSCRIPTION', 'endpoint requis');
      }
      await repo.deletePushSubscriptionByEndpoint(req.user!.id, endpoint);
      res.json({ ok: true });
    }),
  );

  // Task 16.2 device management — list/revoke the signed-in account's
  // registered browsers (e.g. "forget this device" in account settings).
  router.get(
    '/subscriptions',
    wrap(async (req, res) => {
      res.json({ subscriptions: await repo.listPushSubscriptions(req.user!.id) });
    }),
  );

  router.delete(
    '/subscriptions/:id',
    wrap(async (req, res) => {
      await repo.deletePushSubscription(req.user!.id, req.params.id);
      res.json({ ok: true });
    }),
  );

  return router;
}
