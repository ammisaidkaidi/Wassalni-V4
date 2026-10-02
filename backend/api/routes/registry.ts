import { Router, type Request } from 'express';
import type { DBHelper } from '../../DB/DBHelper';
import { ApiError, wrap } from '../middleware/errors';

/** Public read-only access to the Algeria administrative registry. */
export function registryRoutes(db: DBHelper): Router {
  const router = Router();

  const intParam = (req: Request): number => {
    const n = Number(req.params.id);
    if (!Number.isInteger(n) || n < 1) throw new ApiError(400, 'BAD_PARAM', 'identifiant invalide');
    return n;
  };

  router.get(
    '/wilayas',
    wrap(async (_req, res) => {
      res.json({
        wilayas: await db.select('wilaya', { columns: ['id', 'code', 'nom_fr', 'nom_ar'], orderBy: 'id' }),
      });
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
          columns: ['id', 'nom_fr', 'nom_ar', 'code_postal'],
          where: { wilaya_id: intParam(req) },
          orderBy: 'nom_fr',
        }),
      });
    }),
  );

  return router;
}
