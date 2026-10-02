/**
 * Offline tests for the SQL utilities + DBHelper SQL generation.
 * No database required — run with: npm run test:utils
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { splitSqlStatements, quoteIdent, inlineParams, sqlLiteral } from '../sql-utils';
import { DBHelper, type SelectOptions } from '../DBHelper';
import type { SupabaseConnection, QueryResult } from '../connection';

let failures = 0;
function check(name: string, cond: boolean): void {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

// ── quoteIdent ────────────────────────────────────────────────────────────────
check('quoteIdent: simple', quoteIdent('trip') === '"trip"');
check('quoteIdent: schema.table', quoteIdent('public.trip') === '"public"."trip"');
try {
  quoteIdent('trip; drop table x');
  check('quoteIdent: rejects injection', false);
} catch {
  check('quoteIdent: rejects injection', true);
}
try {
  quoteIdent('a.b.c');
  check('quoteIdent: rejects 3-part names', false);
} catch {
  check('quoteIdent: rejects 3-part names', true);
}

// ── sqlLiteral / inlineParams ─────────────────────────────────────────────────
check('sqlLiteral: string escape', sqlLiteral("M'Sila") === "'M''Sila'");
check('inlineParams: string + number', inlineParams('select $1, $2', ["a'b", 5]) === "select 'a''b', 5");
check('inlineParams: null/bool', inlineParams('$1, $2, $3', [null, true, false]) === 'null, true, false');
check('inlineParams: jsonb', inlineParams('call p($1)', [{ a: 1 }]) === `call p('{"a":1}'::jsonb)`);
check('inlineParams: date', inlineParams('$1', [new Date('2026-10-03T08:00:00Z')]) === "'2026-10-03T08:00:00.000Z'");

// ── splitSqlStatements — unit cases ──────────────────────────────────────────
check('split: basic', splitSqlStatements('select 1; select 2;').length === 2);
check('split: no split inside string', splitSqlStatements("select 'a;b' as x; select 1;").length === 2);
check(
  'split: escaped quotes (M\'Sila)',
  splitSqlStatements("insert into w values (28,'M''Sila','x'); select 1;").length === 2,
);
check(
  'split: dollar-quoted body kept whole',
  (() => {
    const s = splitSqlStatements('do $$ begin x; end $$; select 1;');
    return s.length === 2 && s[0].includes('begin x;') && s[0].endsWith('$$');
  })(),
);
check(
  'split: $tag$ quoted body kept whole',
  (() => {
    const s = splitSqlStatements('create function f() returns void as $tag$ begin ; end $tag$; select 1;');
    return s.length === 2 && s[0].includes('$tag$');
  })(),
);
check(
  'split: semicolon inside line comment ignored',
  splitSqlStatements('select 1 -- ; not a statement\n; select 2;').length === 2,
);
check(
  'split: trailing comment-only chunk dropped',
  splitSqlStatements('select 1; -- trailing comment ; with ; semicolons').length === 1,
);
check(
  'split: semicolon inside block comment ignored',
  splitSqlStatements('/* a ; b */ select 1;').length === 1,
);

// ── splitSqlStatements — the real schema file ────────────────────────────────
const sqlPath = path.resolve(__dirname, '../../data/init/sql.txt');
const script = fs.readFileSync(sqlPath, 'utf8');
const stmts = splitSqlStatements(script);
const fnCount = stmts.filter((s) => /create or replace function/i.test(s)).length;
const procCount = stmts.filter((s) => /create or replace procedure/i.test(s)).length;
console.log(`\n  sql.txt → ${stmts.length} statements (${fnCount} functions, ${procCount} procedures)\n`);
check('sql.txt: all 41 functions parsed whole', fnCount === 41);
check('sql.txt: all 7 procedures parsed whole', procCount === 7);
check('sql.txt: trip table DDL present', stmts.some((s) => s.includes('create table if not exists trip (')));
check('sql.txt: $sec$ security block is one statement', stmts.some((s) => s.includes('$sec$') && s.includes('security_invoker')));
check('sql.txt: no stray fragments', !stmts.some((s) => /^\s*(end|exception|then|loop)\b/i.test(s)));

// ── DBHelper SQL generation (fake connection, no DB) ─────────────────────────
class FakeConnection {
  lastSql = '';
  lastParams: unknown[] = [];
  async execute(sql: string, params: unknown[] = []): Promise<QueryResult> {
    this.lastSql = sql;
    this.lastParams = params;
    return { rows: [], rowCount: 0, command: null };
  }
}

const fake = new FakeConnection();
const db = new DBHelper(fake as unknown as SupabaseConnection);

async function genSql(opts: SelectOptions = {}): Promise<string> {
  await db.select('trip', opts);
  return fake.lastSql;
}

(async (): Promise<void> => {
  check(
    'select: where + is null + order by + limit',
    (await genSql({ where: { status: 'scheduled', notes: null }, orderBy: 'departure_at desc', limit: 10 })) ===
      'select * from "trip" where "status" = $1 and "notes" is null order by "departure_at" desc limit $2',
  );
  check(
    'select: columns whitelisted',
    (await genSql({ columns: ['id', 'code'] })) === 'select "id", "code" from "trip"',
  );

  await db.insert('driver', { full_name: 'A', phone: '+213' });
  check(
    'insert: returning *',
    fake.lastSql === 'insert into "driver" ("full_name", "phone") values ($1, $2) returning *',
  );

  await db.update('trip', { capacity: 18 }, { id: 'abc' });
  check(
    'update: set + where',
    fake.lastSql === 'update "trip" set "capacity" = $1 where "id" = $2 returning *',
  );

  await db.delete('trip', { id: 'abc' });
  check('delete: where + returning', fake.lastSql === 'delete from "trip" where "id" = $1 returning *');

  try {
    await db.delete('trip', {});
    check('delete: refuses empty where', false);
  } catch {
    check('delete: refuses empty where', true);
  }

  await db.upsert('driver', { full_name: 'A', phone: '+213' }, ['phone']);
  check(
    'upsert: on conflict do update',
    fake.lastSql.startsWith('insert into "driver" ("full_name", "phone") values ($1, $2) on conflict ("phone") do update set'),
  );

  await db.callProcedure('sp_publish_trip', 'trip-uuid');
  check('callProcedure', fake.lastSql === 'call "sp_publish_trip"($1)');

  await db.callScalar('create_trip', 't', '2026-10-03', 20, 0, null, null, null, null);
  check(
    'callScalar (create_trip signature)',
    fake.lastSql === 'select "create_trip"($1, $2, $3, $4, $5, $6, $7, $8)' &&
      JSON.stringify(fake.lastParams) === JSON.stringify(['t', '2026-10-03', 20, 0, null, null, null, null]),
  );

  await db.callFunction('get_dairas', 'Alger');
  check('callFunction (table function)', fake.lastSql === 'select * from "get_dairas"($1)');

  console.log(`\n${failures === 0 ? 'ALL TESTS PASSED' : `${failures} TEST(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
})();
