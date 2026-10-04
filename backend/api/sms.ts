import { randomUUID } from 'node:crypto';
import type { DBHelper } from '../DB/DBHelper';
import type { ApiConfig } from './config';

export interface SmsSendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * Task 17.1/17.2 — SMS provider abstraction.
 *
 * Deliberately vendor-agnostic (mirrors Mailer in api/auth/email.ts and the
 * mock payment gateway in api/payments/mockGateway.ts): every call site
 * depends only on this interface, never on a specific carrier's SDK/HTTP
 * API. Swapping in a real provider later (Twilio, Infobip, a local
 * Algerian aggregator, …) means writing one more implementation of
 * `SmsSender` and wiring it up in `createSmsSender` — none of the call
 * sites (OTP login, notification dispatch) change.
 *
 * No real carrier is wired in this environment (no vendor account/API key
 * exists to integrate against), so the only implementation today is a
 * sandbox: it never fails, logs the message to the server console, and —
 * same as the mock payment gateway — leaves an auditable row in `sms_log`
 * so delivery attempts are inspectable. This is surfaced honestly (not
 * silently): `cfg.sms.provider` is undefined in sandbox mode, and the
 * server logs a clear warning in production.
 */
export interface SmsSender {
  mode: 'sandbox' | string;
  sendSms(to: string, message: string): Promise<SmsSendResult>;
}

export function createSmsSender(cfg: ApiConfig): SmsSender {
  if (cfg.sms.provider) {
    // Placeholder for a future real adapter: intentionally throws rather
    // than silently falling back to the sandbox, so a misconfigured
    // SMS_PROVIDER value in production is never mistaken for working SMS.
    throw new Error(
      `SMS_PROVIDER="${cfg.sms.provider}" is not implemented — add a real SmsSender adapter in api/sms.ts for this vendor, or unset SMS_PROVIDER to use the sandbox.`,
    );
  }
  return {
    mode: 'sandbox',
    async sendSms(to, message) {
      const providerMessageId = `sandbox-${randomUUID()}`;
      console.log(`\n📱 [sms-sandbox] → to: ${to}\n   ${message}\n   (id: ${providerMessageId})\n`);
      return { ok: true, providerMessageId };
    },
  };
}

export interface SmsLogEntry {
  userId: string | null;
  phone: string;
  purpose: 'notification' | 'otp';
  notificationId: string | null;
  message: string;
  status: 'sent' | 'failed';
  providerMessageId: string | null;
  error: string | null;
}

/** Shared by both SMS call sites (OTP login + notification dispatch) so the insert itself is written exactly once. */
export async function recordSmsLog(db: DBHelper, entry: SmsLogEntry): Promise<void> {
  await db.raw(
    `insert into sms_log (user_id, phone, purpose, notification_id, message, status, provider_message_id, error)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [entry.userId, entry.phone, entry.purpose, entry.notificationId, entry.message, entry.status, entry.providerMessageId, entry.error],
  );
}

/** Task 17.2 abuse prevention — how many SMS of this purpose a phone number has received in the last `hours`. */
export async function countRecentSmsToPhone(db: DBHelper, phone: string, purpose: 'notification' | 'otp', hours: number): Promise<number> {
  const rows = await db.raw<{ n: string }>(
    `select count(*) as n from sms_log where phone = $1 and purpose = $2 and created_at > now() - make_interval(hours => $3)`,
    [phone, purpose, hours],
  );
  return Number(rows[0]?.n ?? 0);
}

/** A short, carrier-friendly OTP text (kept well under one SMS segment). */
export function otpSmsText(code: string, ttlMinutes: number): string {
  return `Wassalni — votre code de connexion : ${code}. Expire dans ${ttlMinutes} min. Ne le partagez avec personne.`;
}
