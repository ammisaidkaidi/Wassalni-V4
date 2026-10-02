import type { RequestHandler } from 'express';
import type { AuthService, PublicUser } from '../auth/authService';
import { ApiError } from './errors';

declare module 'express-serve-static-core' {
  interface Request {
    user?: PublicUser;
  }
}

/** Loads req.user from the session cookie (anonymous on any failure). */
export function sessionLoader(svc: AuthService, cookieName: string): RequestHandler {
  return (req, _res, next) => {
    const token = (req as { cookies?: Record<string, string | undefined> }).cookies?.[cookieName];
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

export const requireCustomer: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new ApiError(401, 'UNAUTHORIZED', 'Connexion requise'));
  if (!req.user.customer_id) {
    return next(new ApiError(403, 'NO_CUSTOMER_PROFILE', 'Profil client manquant (téléphone requis)'));
  }
  next();
};
