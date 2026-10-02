import type { ApiConfig } from '../config';
import type { DBHelper } from '../../DB/DBHelper';
import type { DomainRepository } from '../../DB/domain';
import { ApiError } from '../middleware/errors';
import { hashPassword, randomToken, sha256, sixDigitCode, verifyPassword } from './passwords';
import { otpEmailHtml, type Mailer } from './email';

export interface PublicUser {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'customer' | 'admin';
  email_verified: boolean;
  customer_id: string | null;
}

export interface LoginChallenge {
  otp_required: true;
  otp_token: string;
  expires_in: number;
  /** Only present in dev mode (no SMTP configured). */
  dev_code?: string;
}

const USER_COLS = 'id, email, full_name, phone, role, email_verified, customer_id';

/**
 * AuthService — accounts + login with 2FA (one-time code by email) + sessions.
 * Passwords: scrypt. OTP: 6 digits, salted SHA-256 at rest, 10 min expiry,
 * max 5 attempts. Sessions: opaque 64-hex token, only SHA-256 stored server-side.
 */
export class AuthService {
  constructor(
    private readonly db: DBHelper,
    private readonly repo: DomainRepository,
    private readonly cfg: ApiConfig,
    private readonly mailer: Mailer,
  ) {}

  async register(input: { email: string; password: string; full_name: string; phone: string }): Promise<PublicUser> {
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
    return rows[0];
  }

  /** Step 1: verify password → issue an emailed OTP challenge. */
  async login(email: string, password: string): Promise<LoginChallenge> {
    const rows = await this.db.raw<{
      id: string;
      email: string;
      password_hash: string;
      locked_until: string | null;
      failed_attempts: number;
    }>(`select id, email, password_hash, locked_until, failed_attempts from app_user where email = $1`, [
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
    return this.issueChallenge(user.id, user.email);
  }

  /** Re-send the OTP for a pending challenge. */
  async resendChallenge(otpToken: string): Promise<LoginChallenge> {
    const rows = await this.db.raw<{ user_id: string; email: string }>(
      `select o.user_id, u.email from app_user_otp o join app_user u on u.id = o.user_id where o.id = $1`,
      [otpToken],
    );
    const row = rows[0];
    if (!row) throw new ApiError(400, 'OTP_NOT_FOUND', 'Demande introuvable — reconnectez-vous');
    return this.issueChallenge(row.user_id, row.email);
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
      `select u.id, u.email, u.full_name, u.phone, u.role, u.email_verified, u.customer_id, s.expires_at
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
    role: 'customer' | 'admin';
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

  private async issueChallenge(userId: string, email: string): Promise<LoginChallenge> {
    const { otpToken, code } = await this.issueOtp(userId);
    await this.mailer.sendMail(email, 'Wassalni — votre code de connexion', otpEmailHtml(code));
    return {
      otp_required: true,
      otp_token: otpToken,
      expires_in: this.cfg.otpTtlMinutes * 60,
      ...(this.cfg.otpDevMode ? { dev_code: code } : {}),
    };
  }

  private async issueOtp(userId: string): Promise<{ otpToken: string; code: string }> {
    const salt = randomToken(8);
    const code = sixDigitCode();
    const hash = sha256(`${salt}:${code}`);
    await this.db.raw(
      `update app_user_otp set consumed_at = now() where user_id = $1 and purpose = 'login_2fa' and consumed_at is null`,
      [userId],
    );
    const rows = await this.db.raw<{ id: string }>(
      `insert into app_user_otp (user_id, purpose, salt, code_hash, expires_at)
       values ($1, 'login_2fa', $2, $3, now() + make_interval(mins => $4)) returning id`,
      [userId, salt, hash, this.cfg.otpTtlMinutes],
    );
    return { otpToken: rows[0].id, code };
  }
}
