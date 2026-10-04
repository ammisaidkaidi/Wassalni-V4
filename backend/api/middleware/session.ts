import type { RequestHandler } from 'express';
import type { AuthService, PublicUser } from '../auth/authService';
import { ApiError } from './errors';

declare module 'express-serve-static-core' {
  interface Request {
    user?: PublicUser;
  }
}

/** Query-string key carrying the session token for browsers that can't use cookies. */
export const SESSION_QUERY_PARAM = 'sid';

/**
 * Loads req.user from the session token (anonymous on any failure).
 * The token is read from, in order: the `sid` query parameter (works even
 * when the client's browser has cookies disabled/unsupported) or the
 * session cookie (kept as a transparent fallback for normal browsers).
 */
export function sessionLoader(svc: AuthService, cookieName: string): RequestHandler {
  return (req, _res, next) => {
    const queryToken = typeof req.query[SESSION_QUERY_PARAM] === 'string' ? (req.query[SESSION_QUERY_PARAM] as string) : undefined;
    const cookieToken = (req as { cookies?: Record<string, string | undefined> }).cookies?.[cookieName];
    const token = queryToken || cookieToken;
    if (!token) {
      next();
      return;
    }
    svc
      .getUserBySession(token)
      .then((user) => {
        if (user) req.user = user;
        next();
      })
      .catch(() => next());
  };
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'UNAUTHORIZED', 'Connexion requise'));
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'UNAUTHORIZED', 'Connexion requise'));
  if (req.user.role !== 'admin') return next(new ApiError(403, 'FORBIDDEN', 'Accès administrateur requis'));
  next();
};

/**
 * Task 12.6 — granular admin roles, enforced server-side (never trust a
 * client to merely hide a button). 'super_admin' always passes every check;
 * every other role only passes the permissions explicitly listed for it
 * below. Scope decision: applied to every NEW privileged route added in
 * this batch plus a handful of the most sensitive pre-existing ones
 * (wallet adjustment, payout actions, admin role assignment) — retrofitting
 * literal every admin route that predates granular roles would be a much
 * larger refactor than this task warrants; 'admin' (the old default role)
 * keeps the exact same broad access it always had everywhere else.
 */
export const ADMIN_PERMISSIONS: Record<string, readonly string[]> = {
  super_admin: ['*'],
  admin: ['view', 'manage_trips', 'manage_drivers', 'manage_reservations', 'manage_payments', 'manage_payouts', 'manage_promo', 'manage_config', 'manage_backups'],
  support: ['view', 'manage_reservations'],
  finance: ['view', 'manage_payments', 'manage_payouts', 'manage_promo'],
  operations: ['view', 'manage_trips', 'manage_drivers'],
};

export function hasAdminPermission(adminRole: string | null | undefined, permission: string): boolean {
  const role = adminRole || 'admin'; // pre-granular-role admins behave as the broad 'admin' role
  const perms = ADMIN_PERMISSIONS[role] ?? [];
  return perms.includes('*') || perms.includes(permission);
}

export function requirePermission(permission: string): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'UNAUTHORIZED', 'Connexion requise'));
    if (req.user.role !== 'admin') return next(new ApiError(403, 'FORBIDDEN', 'Accès administrateur requis'));
    if (!hasAdminPermission(req.user.admin_role, permission)) {
      return next(new ApiError(403, 'PERMISSION_DENIED', "Votre rôle administrateur ne permet pas cette action"));
    }
    next();
  };
}

export const requireCustomer: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'UNAUTHORIZED', 'Connexion requise'));
  if (!req.user.customer_id) {
    return next(new ApiError(403, 'NO_CUSTOMER_PROFILE', 'Profil client manquant (téléphone requis)'));
  }
  next();
};

export const requireDriver: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'UNAUTHORIZED', 'Connexion requise'));
  if (req.user.role !== 'driver' || !req.user.driver_id) {
    return next(new ApiError(403, 'FORBIDDEN', 'Accès chauffeur requis'));
  }
  next();
};
