/**
 * CLI: create (or promote) an account.
 *
 *   npm run user:create -- admin@example.dz 'Passw0rd!' --role admin --name "Admin"
 *   npm run user:create -- karim@example.dz 'Passw0rd!' --phone +213770000000
 */
import { DBHelper, DomainRepository, SupabaseConnection, loadDbConfig } from '../../DB';
import { AuthService } from '../auth/authService';
import { createMailer } from '../auth/email';
import { ensureAuthSchema } from '../authSchema';
import { loadApiConfig } from '../config';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const positional = argv.filter((a) => !a.startsWith('--'));
  const getOpt = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const [email, password] = positional;
  if (!email || !password) {
    console.log("Usage: npm run user:create -- <email> <password> [--role admin|customer] [--name 'Full Name'] [--phone +213…]");
    process.exit(1);
  }

  const cfg = loadApiConfig();
  const conn = new SupabaseConnection(loadDbConfig());
  try {
    await conn.init();
    await ensureAuthSchema(conn);
    const db = new DBHelper(conn);
    const svc = new AuthService(db, new DomainRepository(db), cfg, createMailer(cfg));
    const user = await svc.createUser({
      email,
      password,
      full_name: getOpt('name') ?? email.split('@')[0],
      role: getOpt('role') === 'admin' ? 'admin' : 'customer',
      phone: getOpt('phone'),
    });
    console.log('✔ user ready:', user);
  } finally {
    await conn.close().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
