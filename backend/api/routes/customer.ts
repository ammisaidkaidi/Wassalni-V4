import { Router } from 'express';
import { z } from 'zod';
import type { DomainRepository } from '../../DB/domain';
import { ApiError, wrap } from '../middleware/errors';
import { requireAuth, requireCustomer } from '../middleware/session';

/**
 * Customer self-service profile (Task 1.2). Columns already existed on
 * `customer` (nin/nif/si/address/home_wilaya_id/home_commune_id/gps_lat/lon)
 * from the KYC/geo work done for drivers/reservations — this just gives the
 * customer themselves a way to read and edit their own row, instead of only
 * admins being able to (admin's /api/admin/customers stays untouched).
 */
const profileSchema = z.object({
  full_name: z.string().trim().min(2).optional(),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/, 'téléphone invalide').optional(),
  email: z.string().email().nullish(),
  nin: z
    .string()
    .regex(/^[0-9]{18}$/, 'NIN invalide (18 chiffres)')
    .nullish(),
  nif: z
    .string()
    .regex(/^[0-9]{20}$/, 'NIF invalide (20 chiffres)')
    .nullish(),
  address: z.string().nullish(),
  home_wilaya_id: z.number().int().min(1).max(99).nullish(),
  home_commune_id: z.number().int().positive().nullish(),
  gps_lat: z.number().min(-90).max(90).nullish(),
  gps_lon: z.number().min(-180).max(180).nullish(),
});

export function customerRoutes(repo: DomainRepository): Router {
  const router = Router();
  router.use(requireAuth, requireCustomer);

  router.get(
    '/me',
    wrap(async (req, res) => {
      const customer = await repo.getCustomer(req.user!.customer_id!);
      if (!customer) throw new ApiError(404, 'NOT_FOUND', 'Profil introuvable');
      res.json({ customer });
    }),
  );

  router.put(
    '/me',
    wrap(async (req, res) => {
      const b = profileSchema.parse(req.body);
      // gps_lat/gps_lon only make sense as a pair — matches the DB's own
      // customer_gps_chk constraint (both null, or both set). Only enforced
      // when at least one of the two is actually part of this patch.
      if (b.gps_lat !== undefined || b.gps_lon !== undefined) {
        const latNull = b.gps_lat === undefined || b.gps_lat === null;
        const lonNull = b.gps_lon === undefined || b.gps_lon === null;
        if (latNull !== lonNull) {
          throw new ApiError(400, 'VALIDATION', 'Latitude et longitude doivent être renseignées ensemble');
        }
      }
      // updateCustomerProfile throws a typed DomainValidationError on a
      // commune/wilaya mismatch — errorHandler maps it to a 400 directly,
      // no string-matching needed here (Task 1.5).
      const customer = await repo.updateCustomerProfile(req.user!.customer_id!, {
        full_name: b.full_name,
        phone: b.phone,
        email: b.email === null ? null : b.email,
        nin: b.nin === null ? null : b.nin,
        nif: b.nif === null ? null : b.nif,
        address: b.address === null ? null : b.address,
        home_wilaya_id: b.home_wilaya_id === null ? null : b.home_wilaya_id,
        home_commune_id: b.home_commune_id === null ? null : b.home_commune_id,
        gps_lat: b.gps_lat === null ? null : b.gps_lat,
        gps_lon: b.gps_lon === null ? null : b.gps_lon,
      });
      res.json({ customer });
    }),
  );

  // Task 6.3 — own received ratings (from drivers), for a "mes évaluations" screen.
  router.get(
    '/me/ratings',
    wrap(async (req, res) => {
      res.json({ ratings: await repo.listRatingsForCustomer(req.user!.customer_id!) });
    }),
  );

  // ── Wallet (Task 9.3) — own balance / history only ──────────────────────────

  router.get(
    '/wallet',
    wrap(async (req, res) => {
      const customerId = req.user!.customer_id!;
      const [balance, history] = await Promise.all([repo.walletBalance(customerId), repo.walletHistory(customerId)]);
      res.json({ balance, history });
    }),
  );

  // ── Promo codes (Task 9.2) ───────────────────────────────────────────────────

  router.post(
    '/promo-codes/redeem',
    wrap(async (req, res) => {
      const b = z.object({ code: z.string().trim().min(1), reservation_id: z.string().uuid() }).parse(req.body);
      const customerId = req.user!.customer_id!;
      const reservation = await repo.getReservationOwner(b.reservation_id);
      if (!reservation) throw new ApiError(404, 'NOT_FOUND', 'Réservation introuvable');
      if (reservation.customer_id !== customerId) throw new ApiError(403, 'FORBIDDEN', 'Cette réservation ne vous appartient pas');
      const basisAmount = Number(reservation.total_price);
      const redemptionId = await repo.redeemPromoCode(customerId, b.code, basisAmount, b.reservation_id);
      const balance = await repo.walletBalance(customerId);
      res.status(201).json({ ok: true, redemption_id: redemptionId, wallet_balance: balance });
    }),
  );

  // ── Referral program (Task 9.4) ─────────────────────────────────────────────

  router.get(
    '/referral',
    wrap(async (req, res) => {
      const customerId = req.user!.customer_id!;
      const [summary, rewards] = await Promise.all([repo.getReferralSummary(customerId), repo.listReferralRewards(customerId)]);
      res.json({ ...summary, rewards });
    }),
  );

  return router;
}
