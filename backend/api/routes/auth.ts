import { Router } from 'express';
import { z } from 'zod';
import type { ApiConfig } from '../config';
import type { AuthService } from '../auth/authService';
import { wrap } from '../middleware/errors';
import { requireAuth, SESSION_QUERY_PARAM } from '../middleware/session';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, '8 caractères minimum'),
  full_name: z.string().trim().min(2, 'nom trop court'),
  phone: z.string().regex(/^\+?[0-9]{8,15}$/, 'numéro de téléphone invalide'),
});
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const verifySchema = z.object({ otp_token: z.string().uuid(), code: z.string().regex(/^[0-9]{6}$/, 'code à 6 chiffres') });

export function authRoutes(svc: AuthService, cfg: ApiConfig): Router {
  const router = Router();

  router.post(
    '/register',
    wrap(async (req, res) => {
      const user = await svc.register(registerSchema.parse(req.body));
      res.status(201).json({ user });
    }),
  );

  router.post(
    '/login',
    wrap(async (req, res) => {
      const b = loginSchema.parse(req.body);
      res.json(await svc.login(b.email, b.password));
    }),
  );

  router.post(
    '/resend-2fa',
    wrap(async (req, res) => {
      const b = z.object({ otp_token: z.string().uuid() }).parse(req.body);
      res.json(await svc.resendChallenge(b.otp_token));
    }),
  );

  router.post(
    '/verify-2fa',
    wrap(async (req, res) => {
      const b = verifySchema.parse(req.body);
      const { token, user } = await svc.verifyOtp(b.otp_token, b.code, {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      // Cookie kept as a transparent fallback for browsers that support it;
      // the primary mechanism is the `token` below, which the client stores
      // itself and sends back as a `?sid=` query parameter on every request
      // (needed for browsers that don't support cookies).
      res.cookie(cfg.cookieName, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: cfg.cookieSecure,
        maxAge: cfg.sessionTtlHours * 3_600_000,
        path: '/',
      });
      res.json({ user, token });
    }),
  );

  router.post(
    '/logout',
    wrap(async (req, res) => {
      const queryToken = typeof req.query[SESSION_QUERY_PARAM] === 'string' ? (req.query[SESSION_QUERY_PARAM] as string) : undefined;
      const cookieToken = (req as { cookies?: Record<string, string | undefined> }).cookies?.[cfg.cookieName];
      await svc.logout(queryToken || cookieToken);
      res.clearCookie(cfg.cookieName, { path: '/' });
      res.json({ ok: true });
    }),
  );

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
