import { Router } from 'express';
import type { DBHelper } from '../../DB/DBHelper';
import type { DomainRepository } from '../../DB/domain';
import { ApiError, wrap } from '../middleware/errors';
import { rateLimit } from '../middleware/rateLimit';
import { GATEWAY_NAME, generateEventId, signPayload, verifySignature, type MockWebhookPayload } from '../payments/mockGateway';

// Task 14.2 — limits the two customer-facing pages (hosted checkout view +
// its "submit" action, i.e. where a real gateway's own card form would be).
// Deliberately NOT applied to /webhook/mock below — that's the gateway's own
// signed, trusted server-to-server callback, equivalent to a real provider's
// webhook delivery, which must never be throttled away.
const checkoutLimiter = rateLimit({ windowMs: 60_000, max: 30, message: 'Trop de tentatives — patientez un instant' });

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * Public (unauthenticated) routes that stand in for an external payment
 * gateway's own hosted pages — a real gateway's checkout/webhook URLs never
 * carry our session cookies either, so each route authenticates itself via
 * its own opaque transaction id (checkout) or HMAC signature (webhook)
 * instead of `requireAuth`. See DB/domain.ts for why the actual
 * paid/failed decision only ever happens inside gateway_apply_payment_event().
 */
export function paymentsRoutes(_db: DBHelper, repo: DomainRepository, selfPort: number): Router {
  const router = Router();

  router.get(
    '/checkout/:transactionId',
    checkoutLimiter,
    wrap(async (req, res) => {
      const payment = await repo.getPaymentByGatewayTransactionId(req.params.transactionId);
      if (!payment || payment.status !== 'pending') {
        res.status(404).send('<!doctype html><title>Paiement introuvable</title><p>Session de paiement introuvable ou déjà traitée.</p>');
        return;
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Paiement — ${escapeHtml(GATEWAY_NAME)}</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
  .card{background:#1e293b;border-radius:16px;padding:32px;max-width:380px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,.4)}
  h1{font-size:18px;margin:0 0 4px}
  .badge{display:inline-block;background:#334155;color:#94a3b8;font-size:11px;padding:2px 8px;border-radius:999px;margin-bottom:16px}
  .amount{font-size:32px;font-weight:700;margin:12px 0}
  .ref{color:#94a3b8;font-size:13px;margin-bottom:24px}
  button{width:100%;padding:12px;border:0;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;margin-top:10px}
  .pay{background:#22c55e;color:#06220f}
  .fail{background:#334155;color:#e2e8f0}
  p.note{font-size:12px;color:#64748b;margin-top:20px;line-height:1.5}
</style></head>
<body>
  <div class="card">
    <span class="badge">PASSERELLE DE PAIEMENT SIMULÉE</span>
    <h1>Réservation ${escapeHtml(payment.reservation_code)}</h1>
    <div class="amount">${Number(payment.amount).toLocaleString('fr-DZ')} ${escapeHtml(payment.currency)}</div>
    <div class="ref">Transaction ${escapeHtml(req.params.transactionId)} · ${escapeHtml(payment.method)}</div>
    <form method="post" action="/api/payments/checkout/${encodeURIComponent(req.params.transactionId)}/submit">
      <button class="pay" name="outcome" value="success" type="submit">✅ Payer avec succès</button>
      <button class="fail" name="outcome" value="failure" type="submit">❌ Simuler un échec</button>
    </form>
    <p class="note">Ceci est une passerelle de paiement simulée (aucun fournisseur algérien réel n'est intégré). En production, cette page serait hébergée par le fournisseur (CIB/SATIM, Edahabia…) et redirigerait ici via un webhook signé après confirmation réelle.</p>
  </div>
</body></html>`);
    }),
  );

  router.post(
    '/checkout/:transactionId/submit',
    checkoutLimiter,
    wrap(async (req, res) => {
      const payment = await repo.getPaymentByGatewayTransactionId(req.params.transactionId);
      if (!payment) throw new ApiError(404, 'NOT_FOUND', 'Session de paiement introuvable');
      const outcome = (req.body?.outcome as string) === 'failure' ? 'failure' : 'success';

      if (payment.status === 'pending') {
        // Simulates the gateway's own async confirmation: builds the exact
        // same payload shape a real provider would send, signs it, and
        // delivers it over a genuine HTTP request to OUR webhook endpoint —
        // exercising the real signature-verification + idempotency code
        // path, not an in-process shortcut.
        const payload: MockWebhookPayload = {
          event_id: generateEventId(),
          event_type: outcome === 'success' ? 'payment.succeeded' : 'payment.failed',
          gateway_transaction_id: req.params.transactionId,
          payment_id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          reason: outcome === 'failure' ? 'Simulé depuis la page de paiement factice' : undefined,
          occurred_at: new Date().toISOString(),
        };
        const rawBody = JSON.stringify(payload);
        const signature = signPayload(rawBody);
        await fetch(`http://127.0.0.1:${selfPort}/api/payments/webhook/mock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Mock-Gateway-Signature': `sha256=${signature}` },
          body: rawBody,
        }).catch((err) => {
          // The webhook call failing should not hide the real problem from
          // an operator — surfaced via server logs (never fabricated as a
          // fake "success" to the browser).
          console.error('mock gateway → webhook self-call failed:', err);
        });
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>Paiement ${outcome === 'success' ? 'confirmé' : 'échoué'}</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#1e293b;border-radius:16px;padding:32px;max-width:380px;width:90%;text-align:center}
h1{font-size:20px}</style></head>
<body><div class="card"><h1>${outcome === 'success' ? '✅ Paiement envoyé' : '❌ Échec simulé'}</h1>
<p>Vous pouvez fermer cette page et revenir à l'application — le statut se mettra à jour automatiquement.</p></div></body></html>`);
    }),
  );

  router.post(
    '/webhook/mock',
    wrap(async (req, res) => {
      const rawBody = ((req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}))).toString('utf8');
      const signatureHeader = req.header('X-Mock-Gateway-Signature');
      const signatureValid = verifySignature(rawBody, signatureHeader);

      const body = req.body as Partial<MockWebhookPayload> | undefined;
      const transactionId = typeof body?.gateway_transaction_id === 'string' ? body.gateway_transaction_id : '';
      const eventId = typeof body?.event_id === 'string' ? body.event_id : '';
      const eventType = body?.event_type === 'payment.failed' ? 'payment.failed' : 'payment.succeeded';

      const payment = transactionId ? await repo.getPaymentByGatewayTransactionId(transactionId) : null;
      if (!payment) {
        // Still log the attempt for audit purposes even when we can't match
        // a payment, but there's nothing to update — not a server error.
        res.status(signatureValid ? 404 : 400).json({ result: 'rejected', reason: !signatureValid ? 'invalid_signature' : 'unknown_transaction' });
        return;
      }

      const result = await repo.applyGatewayPaymentEvent({
        paymentId: payment.id,
        gateway: GATEWAY_NAME,
        gatewayEventId: eventId || `missing-${transactionId}`,
        eventType,
        signatureValid,
        rawPayload: (body as Record<string, unknown>) ?? {},
      });

      res.status(result === 'rejected' ? 400 : 200).json({ result });
    }),
  );

  return router;
}
