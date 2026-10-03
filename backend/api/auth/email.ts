import nodemailer, { type Transporter } from 'nodemailer';
import type { ApiConfig } from '../config';

export interface Mailer {
  mode: 'smtp' | 'console';
  sendMail(to: string, subject: string, html: string): Promise<void>;
}

export function createMailer(cfg: ApiConfig): Mailer {
  if (!cfg.smtp.host) {
    if (cfg.isProduction) {
      // Production with no SMTP configured: never print OTP codes/content to
      // logs. Emails silently "send" nowhere — login will be stuck until
      // SMTP_* is configured. This is intentional (fail closed, not open).
      return {
        mode: 'console',
        async sendMail(to) {
          console.error(`✗ [mailer] SMTP not configured — cannot deliver email to ${to} (set SMTP_* in backend/.env)`);
        },
      };
    }
    // Development mode: no SMTP configured → print the email to the console.
    return {
      mode: 'console',
      async sendMail(to, subject, html) {
        console.log(`\n📧 [dev-mail] ─ to: ${to}\n   subject: ${subject}\n${html.replace(/<[^>]+>/g, '').trim()}\n`);
      },
    };
  }
  const transporter: Transporter = nodemailer.createTransport({
    host: cfg.smtp.host,
    port: cfg.smtp.port,
    secure: cfg.smtp.port === 465,
    auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.pass } : undefined,
  });
  return {
    mode: 'smtp',
    async sendMail(to, subject, html) {
      await transporter.sendMail({ from: cfg.smtp.from, to, subject, html });
    },
  };
}

export function otpEmailHtml(code: string): string {
  return `<div style="font-family:sans-serif;max-width:480px;margin:auto">
    <h2 style="color:#0f766e;margin-bottom:4px">Wassalni</h2>
    <p>Voici votre code de connexion :</p>
    <p style="font-size:34px;letter-spacing:10px;font-weight:700;color:#0f766e">${code}</p>
    <p style="color:#64748b">Ce code expire dans 10 minutes. Ne le partagez avec personne.</p>
  </div>`;
}
