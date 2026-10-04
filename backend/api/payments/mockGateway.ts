// Task 7.1/7.2 — a provider-agnostic MOCK/SANDBOX payment gateway adapter.
//
// This project has no real merchant credentials for any Algerian payment
// provider (CIB/SATIM, Edahabia, …), so this module simulates one end to
// end — checkout session creation, a hosted-looking checkout page, and an
// asynchronous signed webhook callback — using the exact same architecture
// a real integration would use. Swapping in a real gateway later means
// replacing only this file (transaction-id generation + signature
// scheme + the checkout redirect target) — none of the domain code in
// `DB/domain.ts` (payment intent, idempotent webhook application,
// auto-confirm-on-full-payment) is gateway-specific.
import crypto from 'node:crypto';

export const GATEWAY_NAME = 'mock_gateway';

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'dev-mock-gateway-secret-change-me';

export interface MockWebhookPayload {
  event_id: string;
  event_type: 'payment.succeeded' | 'payment.failed';
  gateway_transaction_id: string;
  payment_id: string;
  amount: string;
  currency: string;
  reason?: string;
  occurred_at: string;
}

/** Canonical JSON string used for both signing and verification — must match byte-for-byte. */
export function canonicalize(payload: MockWebhookPayload): string {
  return JSON.stringify(payload);
}

export function signPayload(rawBody: string): string {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody, 'utf8').digest('hex');
}

export function verifySignature(rawBody: string, signatureHeader: string | undefined | null): boolean {
  if (!signatureHeader) return false;
  const provided = signatureHeader.startsWith('sha256=') ? signatureHeader.slice(7) : signatureHeader;
  let expectedBuf: Buffer;
  let providedBuf: Buffer;
  try {
    expectedBuf = Buffer.from(signPayload(rawBody), 'hex');
    providedBuf = Buffer.from(provided, 'hex');
  } catch {
    return false;
  }
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export function generateTransactionId(): string {
  return `MGW-${crypto.randomBytes(10).toString('hex')}`;
}

export function generateEventId(): string {
  return `evt_${crypto.randomBytes(10).toString('hex')}`;
}
