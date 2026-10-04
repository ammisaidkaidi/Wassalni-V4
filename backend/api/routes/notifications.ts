import { Router } from 'express';
import type { DomainRepository } from '../../DB/domain';
import { wrap } from '../middleware/errors';
import { requireAuth } from '../middleware/session';

/**
 * Task 11.1 — Notifications. Generic across customer/driver/admin accounts:
 * every event raised anywhere in the schema (reservation lifecycle,
 * waitlist promotion, SOS, scheduler reminders, …) lands in the same
 * `notification` table keyed by `app_user.id`, so there is exactly one
 * inbox endpoint regardless of which role is asking.
 */
export function notificationsRoutes(repo: DomainRepository): Router {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/',
    wrap(async (req, res) => {
      const unreadOnly = req.query.unread === 'true';
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
      res.json({ notifications: await repo.listNotifications(req.user!.id, unreadOnly, limit) });
    }),
  );

  router.get(
    '/unread-count',
    wrap(async (req, res) => {
      res.json({ count: await repo.countUnreadNotifications(req.user!.id) });
    }),
  );

  router.post(
    '/:id/read',
    wrap(async (req, res) => {
      await repo.markNotificationRead(req.params.id, req.user!.id);
      res.json({ ok: true });
    }),
  );

  router.post(
    '/read-all',
    wrap(async (req, res) => {
      res.json({ marked: await repo.markAllNotificationsRead(req.user!.id) });
    }),
  );

  return router;
}
