import { Router, type Request } from 'express';
import type { DBHelper } from '../../DB/DBHelper';
import type { DomainRepository } from '../../DB/domain';
import { WILAYA_CENTROIDS } from '../data/wilayaCentroids';
import { ApiError, wrap } from '../middleware/errors';

/** Public read-only access to the Algeria administrative registry. */
export function registryRoutes(db: DBHelper, repo: DomainRepository): Router {
  const router = Router();

  const intParam = (req: Request): number => {
    const n = Number(req.params.id);
    if (!Number.isInteger(n) || n < 1) throw new ApiError(400, 'BAD_PARAM', 'identifiant invalide');
    return n;
  };

  router.get(
    '/wilayas',
    wrap(async (_req, res) => {
      const rows = await db.select<{ id: number; code: string; nom_fr: string; nom_ar: string }>('wilaya', {
        columns: ['id', 'code', 'nom_fr', 'nom_ar'],
        orderBy: 'id',
      });
      // Approximate chief-town coordinates, merged in from static reference
      // data (not stored in the DB) — used to place map markers/route lines.
      res.json({
        wilayas: rows.map((w) => ({
          ...w,
          lat: WILAYA_CENTROIDS[w.code]?.lat ?? null,
          lon: WILAYA_CENTROIDS[w.code]?.lon ?? null,
        })),
      });
    }),
  );

  router.get(
    '/wilayas/overview',
    wrap(async (_req, res) => {
      res.json({ wilayas: await repo.wilayaOverview() });
    }),
  );

  /** DZxxx domain error catalogue (v_domain_errors) — handy reference for the admin area. */
  router.get(
    '/errors',
    wrap(async (_req, res) => {
      res.json({ errors: await repo.getDomainErrors() });
    }),
  );

  router.get(
    '/wilayas/:id/dairas',
    wrap(async (req, res) => {
      res.json({
        dairas: await db.select('daira', {
          columns: ['id', 'nom_fr', 'nom_ar'],
          where: { wilaya_id: intParam(req) },
          orderBy: 'nom_fr',
        }),
      });
    }),
  );

  router.get(
    '/wilayas/:id/communes',
    wrap(async (req, res) => {
      res.json({
        communes: await db.select('commune', {
          columns: ['id', 'daira_id', 'nom_fr', 'nom_ar', 'code_postal'],
          where: { wilaya_id: intParam(req) },
          orderBy: 'nom_fr',
        }),
      });
    }),
  );

  return router;
}
