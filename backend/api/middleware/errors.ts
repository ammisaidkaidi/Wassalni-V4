import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { explainDomainError } from '../../DB/domain';

/** HTTP error with a machine-readable code — thrown anywhere, mapped by errorHandler. */
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wrap async route handlers so rejections reach the error middleware. */
export const wrap =
  (fn: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION',
        message: err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join(' ; '),
      },
    });
    return;
  }
  const domain = explainDomainError(err);
  if (domain) {
    // SQLSTATE DZxxx raised by the delivery-domain functions/triggers
    res.status(400).json({ error: { code: domain.sqlstate, message: domain.message, description: domain.description } });
    return;
  }
  // PostgreSQL SQLSTATE: a property in direct mode, embedded in the message in
  // Management API mode ("Failed to run sql query: ERROR:  23505: …")
  const pgCode =
    (err as { code?: string })?.code ??
    /ERROR:\s+(\d{5}):/.exec(err instanceof Error ? err.message : String(err))?.[1];
  if (pgCode === '23505') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Cette valeur existe déjà' } });
    return;
  }
  if (pgCode === '23503') {
    res.status(409).json({ error: { code: 'IN_USE', message: 'Cette entrée est référencée ailleurs — suppression impossible' } });
    return;
  }
  console.error('✗ unhandled error:', err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Erreur interne du serveur' } });
}
