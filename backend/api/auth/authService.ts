import type { ApiConfig } from '../config';
import type { DBHelper } from '../../DB/DBHelper';
import type { DomainRepository } from '../../DB/domain';
import { ApiError } from '../middleware/errors';
import { countRecentSmsToPhone, otpSmsText, recordSmsLog, type SmsSender } from '../sms';
import { hashPassword, randomToken, sha256, sixDigitCode, verifyPassword } from './passwords';
import { otpEmailHtml, type Mailer } from './email';

export type OtpChannel = 'email' | 'sms';

export type AdminRole = 'super_admin' | 'admin' | 'support' | 'finance' | 'operations';

export interface PublicUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'customer' | 'admin' | 'driver';
  email_verified: boolean;
  customer_id: string | null;
  driver_id: string | null;
  /** Task 12.6 — only set when role === 'admin'. */
  admin_role: AdminRole | null;
}

export interface LoginChallenge {
  otp_required: true;
  otp_token: string;
  expires_in: number;
  /** Task 17.2 — which channel this particular code was sent over. */
  channel: OtpChannel;
  /** Whether this account could switch to the SMS channel (has a phone on file, and SMS is actually available — see AuthService.smsChannelAvailable). */
  can_use_sms: boolean;
  /** Only present in dev mode (no SMTP configured) or whenever the channel is SMS (no real carrier is wired in this environment — see api/sms.ts). */
  dev_code?: string;
}

const USER_COLS = 'id, email, full_name, phone, role, email_verified, customer_id, driver_id, admin_role';


/**
 * AuthService — accounts + login with 2FA (one-time code by email or SMS,
 * Task 17.2) + sessions. Passwords: scrypt. OTP: 6 digits, salted SHA-256 at
 * rest, 10 min expiry, max 5 attempts. Sessions: opaque 64-hex token, only
 * SHA-256 stored server-side.
 */
export class AuthService {
  constructor(
    private readonly db: DBHelper,
    private readonly repo: DomainRepository,
    private readonly cfg: ApiConfig,
    private readonly mailer: Mailer,
    private readonly smsSender: SmsSender,
  ) {}

  /** Task 17.2 — SMS is only offered as a real option once a non-sandbox provider is wired; in production, offering a sandbox-only "send" would silently never reach the user's phone. Dev/test always allows it so the flow is exercisable end-to-end. */
  private smsChannelAvailable(): boolean {
    return !!this.cfg.sms.provider || !this.cfg.isProduction;
  }

  /** Throws if `channel` can't actually be used for this account right now; otherwise returns the phone number to send to. */
  private async assertSmsChannelAllowed(phone: string | null): Promise<string> {
    if (!this.smsChannelAvailable()) {
      throw new ApiError(400, 'SMS_CHANNEL_UNAVAILABLE', "L'envoi de code par SMS n'est pas disponible pour le moment — utilisez l'email.");
    }
    if (!phone) {
      throw new ApiError(400, 'PHONE_REQUIRED', 'Aucun numéro de téléphone enregistré sur ce compte — utilisez l’email.');
    }
    // Task 17.2 abuse prevention — independent of the per-IP /api/auth rate
    // limiter: caps how many OTP SMS a single phone number can receive in a
    // day, regardless of which IP(s) the requests came from.
    const recent = await countRecentSmsToPhone(this.db, phone, 'otp', 24);
    if (recent >= this.cfg.sms.otpMaxPerPhonePerDay) {
      throw new ApiError(429, 'SMS_OTP_DAILY_LIMIT', 'Trop de codes envoyés par SMS à ce numéro aujourd’hui — réessayez demain ou utilisez l’email.');
    }
    return phone;
  }

  async register(input: { email: string; password: string; full_name: string; phone: string; referral_code?: string | null }): Promise<PublicUser> {
    const email = input.email.trim().toLowerCase();
    const fullName = input.full_name.trim();
    const phone = input.phone.trim();
    const existing = await this.db.raw(`select 1 from app_user where email = $1`, [email]);
    if (existing.length > 0) throw new ApiError(409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cet email');
    const customerId = await this.repo.createCustomer(fullName, phone, email);
    const passwordHash = await hashPassword(input.password);
    const rows = await this.db.raw<PublicUser>(
      `insert into app_user (email, password_hash, full_name, phone, role, customer_id)
       values ($1, $2, $3, $4, 'customer', $5)
       returning ${USER_COLS}`,
      [email, passwordHash, fullName, phone, customerId],
    );
    // Task 9.4 — optional referral attribution. Non-fatal: a mistyped/
    // unknown code must never block account creation, it's just lost.
    if (input.referral_code && input.referral_code.trim()) {
      try {
        await this.repo.attributeReferral(customerId, input.referral_code.trim());
      } catch {
        // swallow (DZ771/DZ772/DZ773) — the account is still created normally.
      }
    }
    return rows[0];
  }

  /** Step 1: verify password → issue an emailed OTP challenge. */
  async login(email: string, password: string, channel: OtpChannel = 'email'): Promise<LoginChallenge> {
    const rows = await this.db.raw<{
      id: string;
      email: string;
      phone: string | null;
      password_hash: string;
      locked_until: string | null;
      failed_attempts: number;
    }>(`select id, email, phone, password_hash, locked_until, failed_attempts from app_user where email = $1`, [
      email.trim().toLowerCase(),
    ]);
    const user = rows[0];
    if (!user) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect');
    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      throw new ApiError(429, 'ACCOUNT_LOCKED', 'Compte temporairement verrouillé — réessayez plus tard');
    }
    if (!(await verifyPassword(password, user.password_hash))) {
      const failed = user.failed_attempts + 1;
      await this.db.raw(
        `update app_user set failed_attempts = $2,
            locked_until = case when $2 >= $3 then now() + make_interval(mins => $4) else locked_until end
          where id = $1`,
        [user.id, failed, this.cfg.maxFailedLogins, this.cfg.lockMinutes],
      );
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect');
    }
    await this.db.raw(`update app_user set failed_attempts = 0, locked_until = null where id = $1`, [user.id]);
    if (channel === 'sms') await this.assertSmsChannelAllowed(user.phone);
    return this.issueChallenge(user.id, user.email, user.phone, channel);
  }

  /**
   * Re-send the OTP for a pending challenge, optionally switching channel
   * (Task 17.2 — e.g. "send by SMS instead" once the email hasn't arrived).
   * Task 14.3 — OTP abuse control: a minimum cooldown between resends, on
   * top of the generic per-IP /api/auth rate limit, so a single click-spam
   * (or someone else's IP sharing that limit) can't be used to bombard a
   * victim's inbox/phone with repeated codes.
   */
  async resendChallenge(otpToken: string, requestedChannel?: OtpChannel): Promise<LoginChallenge> {
    const rows = await this.db.raw<{ user_id: string; email: string; phone: string | null; channel: OtpChannel; created_at: string }>(
      `select o.user_id, u.email, u.phone, o.channel, o.created_at from app_user_otp o join app_user u on u.id = o.user_id where o.id = $1`,
      [otpToken],
    );
    const row = rows[0];
    if (!row) throw new ApiError(400, 'OTP_NOT_FOUND', 'Demande introuvable — reconnectez-vous');
    const elapsedSeconds = (Date.now() - new Date(row.created_at).getTime()) / 1000;
    const waitSeconds = Math.ceil(this.cfg.otpResendCooldownSeconds - elapsedSeconds);
    if (waitSeconds > 0) {
      throw new ApiError(429, 'OTP_RESEND_TOO_SOON', `Veuillez patienter ${waitSeconds}s avant de redemander un code`);
    }
    const channel = requestedChannel ?? row.channel;
    if (channel === 'sms') await this.assertSmsChannelAllowed(row.phone);
    return this.issueChallenge(row.user_id, row.email, row.phone, channel);
  }

  /** Step 2: verify the emailed code → create a session (returned token goes in an httpOnly cookie). */
  async verifyOtp(
    otpToken: string,
    code: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ token: string; user: PublicUser }> {
    const rows = await this.db.raw<{
      id: string;
      user_id: string;
      salt: string;
      code_hash: string;
      expires_at: string;
      attempts: number;
    }>(
      `select id, user_id, salt, code_hash, expires_at, attempts from app_user_otp
        where id = $1 and purpose = 'login_2fa' and consumed_at is null`,
      [otpToken],
    );
    const otp = rows[0];
    if (!otp) throw new ApiError(400, 'OTP_INVALID', 'Code introuvable ou déjà utilisé — reconnectez-vous');
    if (new Date(otp.expires_at).getTime() < Date.now()) {
      await this.db.raw(`update app_user_otp set consumed_at = now() where id = $1`, [otp.id]);
      throw new ApiError(400, 'OTP_EXPIRED', 'Code expiré — demandez un nouveau code');
    }
    if (otp.attempts >= this.cfg.otpMaxAttempts) {
      await this.db.raw(`update app_user_otp set consumed_at = now() where id = $1`, [otp.id]);
      throw new ApiError(429, 'OTP_TOO_MANY_ATTEMPTS', 'Trop de tentatives — reconnectez-vous');
    }
    if (sha256(`${otp.salt}:${code}`) !== otp.code_hash) {
      const attempts = otp.attempts + 1;
      await this.db.raw(
        `update app_user_otp set attempts = $2,
            consumed_at = case when $2 >= $3 then now() else consumed_at end
          where id = $1`,
        [otp.id, attempts, this.cfg.otpMaxAttempts],
      );
      throw new ApiError(401, 'OTP_WRONG', 'Code incorrect');
    }
    await this.db.raw(`update app_user_otp set consumed_at = now() where id = $1`, [otp.id]);
    await this.db.raw(`update app_user set email_verified = true, failed_attempts = 0 where id = $1`, [otp.user_id]);

    const token = randomToken(32);
    await this.db.raw(
      `insert into app_session (token_hash, user_id, expires_at, user_agent, ip)
       values ($1, $2, now() + make_interval(hours => $3), $4, $5)`,
      [sha256(token), otp.user_id, this.cfg.sessionTtlHours, meta.userAgent ?? null, meta.ip ?? null],
    );
    const user = await this.getUserById(otp.user_id);
    if (!user) throw new ApiError(500, 'INTERNAL', 'Utilisateur introuvable');
    return { token, user };
  }

  async getUserById(id: string): Promise<PublicUser | null> {
    const rows = await this.db.raw<PublicUser>(`select ${USER_COLS} from app_user where id = $1`, [id]);
    return rows[0] ?? null;
  }

  async getUserBySession(token: string): Promise<PublicUser | null> {
    const rows = await this.db.raw<PublicUser & { expires_at: string }>(
      `select u.id, u.email, u.full_name, u.phone, u.role, u.email_verified, u.customer_id, u.driver_id, u.admin_role, s.expires_at
         from app_session s join app_user u on u.id = s.user_id
        where s.token_hash = $1`,
      [sha256(token)],
    );
    const row = rows[0];
    if (!row || new Date(row.expires_at).getTime() < Date.now()) return null;
    void this.db.raw(`update app_session set last_seen_at = now() where token_hash = $1`, [sha256(token)]).catch(
      () => undefined,
    );
    return {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      phone: row.phone,
      role: row.role,
      email_verified: row.email_verified,
      customer_id: row.customer_id,
      driver_id: row.driver_id,
      admin_role: row.admin_role,
    };
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.db.raw(`delete from app_session where token_hash = $1`, [sha256(token)]);
  }

  /** Direct user creation (CLI: npm run user:create) — also promotes to admin. */
  async createUser(input: {
    email: string;
    password: string;
    full_name: string;
    role: 'customer' | 'admin' | 'driver';
    phone?: string;
  }): Promise<PublicUser> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.db.raw<PublicUser>(`select ${USER_COLS} from app_user where email = $1`, [email]);
    const found = existing[0];
    if (found) {
      if (input.role === 'admin' && found.role !== 'admin') {
        const rows = await this.db.raw<PublicUser>(
          `update app_user set role = 'admin' where id = $1 returning ${USER_COLS}`,
          [found.id],
        );
        return rows[0];
      }
      return found;
    }
    let customerId: string | null = null;
    if (input.role === 'customer') {
      if (!input.phone) throw new ApiError(400, 'PHONE_REQUIRED', 'Un téléphone est requis pour un compte client');
      customerId = await this.repo.createCustomer(input.full_name.trim(), input.phone, email);
    }
    const passwordHash = await hashPassword(input.password);
    const rows = await this.db.raw<PublicUser>(
      `insert into app_user (email, password_hash, full_name, phone, role, customer_id)
       values ($1, $2, $3, $4, $5, $6) returning ${USER_COLS}`,
      [email, passwordHash, input.full_name.trim(), input.phone?.trim() ?? null, input.role, customerId],
    );
    return rows[0];
  }

  /** The app_user account (if any) already linked to a given driver fleet record. */
  async getDriverAccount(driverId: string): Promise<PublicUser | null> {
    const rows = await this.db.raw<PublicUser>(`select ${USER_COLS} from app_user where driver_id = $1`, [driverId]);
    return rows[0] ?? null;
  }

  /**
   * Admin action: grant (or reset) a login for an existing `driver` fleet
   * record so that person can sign in to the driver UI. Unlike customer
   * registration, the driver record (NIN/phone/etc.) must already exist —
   * this only attaches/repairs the app_user credentials pointing at it.
   */
  async createDriverAccount(input: { driverId: string; email: string; password: string; full_name?: string }): Promise<PublicUser> {
    const driverRows = await this.db.raw<{ id: string; full_name: string }>(`select id, full_name from driver where id = $1`, [
      input.driverId,
    ]);
    const driver = driverRows[0];
    if (!driver) throw new ApiError(404, 'NOT_FOUND', 'Chauffeur introuvable');

    const email = input.email.trim().toLowerCase();
    const fullName = (input.full_name ?? driver.full_name).trim();
    const passwordHash = await hashPassword(input.password);

    const byDriver = await this.getDriverAccount(input.driverId);
    const byEmail = await this.db.raw<{ id: string; driver_id: string | null }>(`select id, driver_id from app_user where email = $1`, [
      email,
    ]);
    if (byEmail[0] && byEmail[0].id !== byDriver?.id) {
      throw new ApiError(409, 'EMAIL_TAKEN', 'Un compte existe déjà avec cet email');
    }

    if (byDriver) {
      // Reset credentials on the existing linked account.
      const rows = await this.db.raw<PublicUser>(
        `update app_user set email = $1, password_hash = $2, full_name = $3, role = 'driver', failed_attempts = 0, locked_until = null
          where id = $4 returning ${USER_COLS}`,
        [email, passwordHash, fullName, byDriver.id],
      );
      return rows[0];
    }
    const rows = await this.db.raw<PublicUser>(
      `insert into app_user (email, password_hash, full_name, role, driver_id)
       values ($1, $2, $3, 'driver', $4) returning ${USER_COLS}`,
      [email, passwordHash, fullName, input.driverId],
    );
    return rows[0];
  }

  private async issueChallenge(userId: string, email: string, phone: string | null, channel: OtpChannel): Promise<LoginChallenge> {
    const { otpToken, code } = await this.issueOtp(userId, channel);
    if (channel === 'sms') {
      // Checked by every caller (login/resendChallenge) before reaching
      // here via assertSmsChannelAllowed, so phone is guaranteed non-null —
      // this guard only protects against a future caller forgetting to.
      if (!phone) throw new ApiError(400, 'PHONE_REQUIRED', 'Aucun numéro de téléphone enregistré sur ce compte');
      const message = otpSmsText(code, this.cfg.otpTtlMinutes);
      const result = await this.smsSender.sendSms(phone, message);
      await recordSmsLog(this.db, {
        userId,
        phone,
        purpose: 'otp',
        notificationId: null,
        message,
        status: result.ok ? 'sent' : 'failed',
        providerMessageId: result.providerMessageId ?? null,
        error: result.error ?? null,
      });
    } else {
      await this.mailer.sendMail(email, 'Wassalni — votre code de connexion', otpEmailHtml(code));
    }
    return {
      otp_required: true,
      otp_token: otpToken,
      channel,
      can_use_sms: !!phone && this.smsChannelAvailable(),
      expires_in: this.cfg.otpTtlMinutes * 60,
      // Never leak the OTP in the API response outside local/dev use. SMS
      // always goes through the sandbox in this environment (no real
      // carrier wired — see api/sms.ts), so exposing it there too is the
      // only way to actually test the flow; production never echoes it
      // regardless of channel.
      ...(!this.cfg.isProduction && (channel === 'sms' || this.cfg.otpDevMode) ? { dev_code: code } : {}),
    };
  }

  private async issueOtp(userId: string, channel: OtpChannel): Promise<{ otpToken: string; code: string }> {
    const salt = randomToken(8);
    const code = sixDigitCode();
    const hash = sha256(`${salt}:${code}`);
    await this.db.raw(
      `update app_user_otp set consumed_at = now() where user_id = $1 and purpose = 'login_2fa' and consumed_at is null`,
      [userId],
    );
    const rows = await this.db.raw<{ id: string }>(
      `insert into app_user_otp (user_id, purpose, channel, salt, code_hash, expires_at)
       values ($1, 'login_2fa', $2, $3, $4, now() + make_interval(mins => $5)) returning id`,
      [userId, channel, salt, hash, this.cfg.otpTtlMinutes],
    );
    return { otpToken: rows[0].id, code };
  }
}
