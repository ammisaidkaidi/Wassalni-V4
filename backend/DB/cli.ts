/**
 * cli.ts — command-line entry point for the Supabase data layer.
 *
 *   npm run db:init     → install schema (sql.txt) + import algeria.txt
 *   npm run db:status   → connection info, table counts, last import
 *   npm run db:tables   → list tables
 *   npm run db:demo     → end-to-end demo (driver → vehicle → trajectory →
 *                         prices → create_trip → publish → reserve)
 *   npm run db -- <cmd> → everything below
 */

import { loadDbConfig, maskSecret } from './config';
import { SupabaseConnection } from './connection';
import { DatabaseInitializer } from './DatabaseInitializer';
import { DBHelper } from './DBHelper';
import { DomainRepository, explainDomainError } from './domain';

const USAGE = `Delivery backend — Supabase DB CLI

Usage: npm run db -- <command> [options]        (run from backend/)

Commands:
  init                     Install schema (data/init/sql.txt) + import Algeria
                             registry (data/init/algeria.txt)
                             --schema-only   only run the DDL script
                             --data-only     only run the algeria.txt import
                             --force         re-run DDL even if already installed
  reset                    ⚠ DROP everything in schema public of the project
                           (old schema, PostGIS…), then reinstall v3 + data
  status                   Connection info, table counts, last import_log entry
  tables                   List tables (schema public)
  views                    List views
  columns <table>          Show columns of a table
  select <table> [limit]   Quick SELECT, e.g.
                           npm run db -- select trip 5 --where status=scheduled
  demo                     End-to-end demo: driver, vehicle, trajectory,
                           default price, create_trip, stops, publish,
                           prices, customer, reservation
  help                     This help
`;

interface ParsedArgs {
  positionals: string[];
  flags: Set<string>;
  where: Record<string, unknown>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Set<string>();
  const where: Record<string, unknown> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--where') {
      const kv = argv[++i] ?? '';
      const idx = kv.indexOf('=');
      if (idx < 0) throw new Error(`--where expects col=value, got "${kv}"`);
      where[kv.slice(0, idx)] = coerce(kv.slice(idx + 1));
    } else if (a.startsWith('--')) {
      flags.add(a);
    } else {
      positionals.push(a);
    }
  }
  return { positionals, flags, where };
}

function coerce(v: string): unknown {
  if (v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  return v;
}

async function main(): Promise<void> {
  const [cmd = 'help', ...rest] = process.argv.slice(2);
  const { positionals, flags, where } = parseArgs(rest);
  if (cmd === 'help' || flags.has('--help')) {
    console.log(USAGE);
    return;
  }

  const cfg = loadDbConfig();
  const conn = new SupabaseConnection(cfg);

  try {
    await conn.init(); // fail fast with a clear message on bad credentials
    const db = new DBHelper(conn);
    const initializer = new DatabaseInitializer(conn, cfg, (m) => console.log(m));

    switch (cmd) {
      case 'init': {
        const d = conn.describe();
        console.log(`Connection: ${d.mode} → ${d.target}`);
        if (cfg.supabaseAccessToken) console.log(`Token: ${maskSecret(cfg.supabaseAccessToken)}`);
        const report = await initializer.initialize({
          schemaOnly: flags.has('--schema-only'),
          dataOnly: flags.has('--data-only'),
          force: flags.has('--force'),
        });
        console.log(
          `\n✔ Schema: ${report.schema.skipped ? 'skipped (already installed)' : `${report.schema.statements} statements executed`}`,
        );
        if (report.data) {
          console.log(
            `✔ Algeria data: ${report.data.database.wilayas} wilayas / ${report.data.database.dairas} dairas / ` +
              `${report.data.database.communes} communes (import_log #${report.data.database.importLogId})`,
          );
        }
        report.warnings.forEach((w) => console.warn(`⚠ ${w}`));
        break;
      }

      case 'reset': {
        const d = conn.describe();
        console.log(`Connection: ${d.mode} → ${d.target}`);
        console.log('⚠ Dropping everything in schema public, then reinstalling v3 + Algeria data…');
        await initializer.reset();
        const report = await initializer.initialize({ force: true });
        console.log(
          `\n✔ Schema: ${report.schema.statements} statements executed` +
            (report.schema.skipped ? ' (skipped)' : ''),
        );
        if (report.data) {
          console.log(
            `✔ Algeria data: ${report.data.database.wilayas} wilayas / ${report.data.database.dairas} dairas / ` +
              `${report.data.database.communes} communes (import_log #${report.data.database.importLogId})`,
          );
        }
        report.warnings.forEach((w) => console.warn(`⚠ ${w}`));
        break;
      }

      case 'status': {
        const d = conn.describe();
        console.log(`Connection: ${d.mode} → ${d.target}`);
        const st = await initializer.status();
        if (!st.installed) {
          console.log('Schema: NOT installed — run: npm run db:init');
          break;
        }
        console.log('Schema: installed ✔');
        console.table(Object.entries(st.counts ?? {}).map(([table, rows]) => ({ table, rows })));
        if (st.lastImport) console.log('Last import_log:', st.lastImport);
        break;
      }

      case 'tables': {
        console.table((await db.listTables()).map((table) => ({ table })));
        break;
      }

      case 'views': {
        console.table((await db.listViews()).map((view) => ({ view })));
        break;
      }

      case 'columns': {
        const table = positionals[0];
        if (!table) throw new Error('usage: columns <table>');
        console.table(await db.listColumns(table));
        break;
      }

      case 'select': {
        const table = positionals[0];
        if (!table) throw new Error('usage: select <table> [limit] [--where col=value …]');
        const limit = positionals[1] !== undefined ? Number(positionals[1]) : 20;
        const rows = await db.select(table, { where, limit });
        console.log(`${rows.length} row(s) from ${table}`);
        console.table(rows);
        break;
      }

      case 'demo': {
        await demo(db);
        break;
      }

      default:
        console.log(`Unknown command: ${cmd}\n`);
        console.log(USAGE);
    }
  } catch (err) {
    const explained = explainDomainError(err);
    if (explained) {
      console.error(`✗ Domain error ${explained.sqlstate}: ${explained.description}`);
      console.error(`  ${explained.message}`);
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${msg}`);
      if (/relation "[\w.]+" does not exist/.test(msg)) {
        console.error('  → the schema is probably not installed yet. Run: npm run db:init');
      }
    }
    process.exitCode = 1;
  } finally {
    await conn.close().catch(() => undefined);
  }
}

/** End-to-end demo of the whole trip lifecycle (idempotent; a new trip each run). */
async function demo(db: DBHelper): Promise<void> {
  const repo = new DomainRepository(db);

  console.log('1) Driver & vehicle (upsert)');
  const driver = await db.upsert<{ id: string }>(
    'driver',
    { full_name: 'Demo Driver', nin: '123456789012345678', phone: '+213555000111' },
    ['phone'],
  );
  const vehicle = await db.upsert<{ id: string }>(
    'vehicle',
    { matricule: '16-111-222-33', seats: 20, nif_owner: '12345678901234567890', make: 'Demo', model: 'Bus' },
    ['matricule'],
  );

  console.log('2) Trajectory "Démo Alger-Oran" + wpoints (Alger, Oran)');
  const trajectoryId = await repo.createTrajectory('Démo Alger-Oran');
  const wpAlger = await repo.addWpoint(trajectoryId, 'Alger');
  const wpOran = await repo.addWpoint(trajectoryId, 'Oran');

  console.log('3) Default price template Alger→Oran = 2500 DZD');
  await repo.setDefaultTripPrice({
    trajectoryId,
    fromWpointId: wpAlger,
    toWpointId: wpOran,
    price: 2500,
  });

  console.log('4) create_trip(…)');
  const tripId = await repo.createTrip({
    trajectoryId,
    departureAt: new Date(Date.now() + 24 * 3600 * 1000),
    capacity: 20,
    seatPrice: 0,
    driverId: driver.id,
    vehicleId: vehicle.id,
    notes: 'demo trip',
  });

  console.log('5) Populate stops → publish → copy default prices');
  const nbStops = await repo.populateTripStops(tripId);
  await repo.publishTrip(tripId);
  await repo.populateTripPricesFromDefaults(tripId, false);
  console.log(`   ${nbStops} stops, published, prices copied`);

  console.log('6) Customer + reservation (2 seats Alger→Oran)');
  const customerId = await repo.createCustomer('Amine Demo', '+213770000000');
  const reservationId = await repo.reserve({
    tripId,
    customerId,
    seats: 2,
    pickupWpointId: wpAlger,
    dropoffWpointId: wpOran,
  });

  console.log('\n7) Results (views v_trip / v_reservation)');
  const t = await repo.getTrip(tripId);
  console.table([
    {
      code: t?.code,
      status: t?.status,
      published: !!t?.published_at,
      capacity: t?.capacity,
      seats_available: t?.seats_available,
      active_reservations: t?.nb_active_reservations,
      driver: t?.driver_name,
      vehicle: t?.vehicle_matricule,
    },
  ]);
  const r = await repo.getReservation(reservationId);
  console.table([
    {
      code: r?.code,
      status: r?.status,
      seats: r?.seats,
      total: r?.total_price,
      paid: r?.amount_paid,
      balance: r?.balance_due,
      customer: r?.customer_name,
    },
  ]);
  console.log(`\n✔ Demo complete (trip ${tripId}, reservation ${reservationId})`);
}

main().catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
