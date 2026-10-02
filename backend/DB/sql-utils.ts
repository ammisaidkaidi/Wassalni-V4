/**
 * sql-utils.ts — helpers for building and splitting SQL safely.
 * Used by both transports (direct pg / Supabase Management API).
 */

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Whitelist-validate and double-quote an identifier ("schema.table" allowed). */
export function quoteIdent(ident: string): string {
  const parts = ident.split('.');
  if (parts.length === 0 || parts.length > 2 || parts.some((p) => !IDENT_RE.test(p))) {
    throw new Error(`Unsafe SQL identifier: ${JSON.stringify(ident)}`);
  }
  return parts.map((p) => `"${p}"`).join('.');
}

function escapeStringLiteral(s: string): string {
  return s.replace(/'/g, "''");
}

/** Render a JS value as a SQL literal (used by the Management API transport). */
export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Cannot inline non-finite number: ${value}`);
    return String(value);
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return `'${escapeStringLiteral(value)}'`;
  if (value instanceof Date) return `'${value.toISOString()}'`;
  // arrays / plain objects → jsonb
  return `'${escapeStringLiteral(JSON.stringify(value))}'::jsonb`;
}

/**
 * Replace $1..$n placeholders with literals (Management API transport —
 * the endpoint has no client-side bind parameters).
 * NOTE: only use with SQL you control; placeholders inside string literals
 * are also replaced.
 */
export function inlineParams(sql: string, params: unknown[]): string {
  return sql.replace(/\$(\d+)/g, (match, digits: string) => {
    const idx = Number(digits) - 1;
    if (idx < 0 || idx >= params.length) {
      throw new Error(`SQL references ${match} but only ${params.length} parameter(s) were provided`);
    }
    return sqlLiteral(params[idx]);
  });
}

/**
 * Split a SQL script into individual statements. Understands:
 *  - single-quoted strings (with '' escapes)  e.g. 'M''Sila'
 *  - double-quoted identifiers
 *  - dollar-quoted bodies ($$…$$ or $tag$…$tag$) — keeps plpgsql bodies whole
 *  - -- line comments and block comments (semicolons inside them are ignored)
 * Comment-only chunks are dropped. Throws if the script ends inside an
 * unterminated string/comment/dollar-quote.
 */
export function splitSqlStatements(script: string): string[] {
  const statements: string[] = [];
  const n = script.length;
  let buf = '';
  let i = 0;

  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag: string | null = null;

  const pushStatement = (): void => {
    const stmt = buf.trim();
    if (stmt && !isOnlyComments(stmt)) statements.push(stmt);
    buf = '';
  };

  while (i < n) {
    const ch = script[i];
    const next = i + 1 < n ? script[i + 1] : '';

    if (inLineComment) {
      buf += ch;
      if (ch === '\n') inLineComment = false;
      i++;
      continue;
    }
    if (inBlockComment) {
      buf += ch;
      if (ch === '*' && next === '/') {
        buf += next;
        i += 2;
        inBlockComment = false;
      } else {
        i++;
      }
      continue;
    }
    if (inSingle) {
      buf += ch;
      if (ch === "'") {
        if (next === "'") {
          buf += next; // escaped '' stays inside the string
          i += 2;
          continue;
        }
        inSingle = false;
      }
      i++;
      continue;
    }
    if (inDouble) {
      buf += ch;
      if (ch === '"') {
        if (next === '"') {
          buf += next;
          i += 2;
          continue;
        }
        inDouble = false;
      }
      i++;
      continue;
    }
    if (dollarTag !== null) {
      if (ch === '$' && script.startsWith(dollarTag, i)) {
        buf += dollarTag;
        i += dollarTag.length;
        dollarTag = null;
        continue;
      }
      buf += ch;
      i++;
      continue;
    }

    // plain code state
    if (ch === '-' && next === '-') {
      inLineComment = true;
      buf += '--';
      i += 2;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      buf += '/*';
      i += 2;
      continue;
    }
    if (ch === "'") {
      inSingle = true;
      buf += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      buf += ch;
      i++;
      continue;
    }
    if (ch === '$') {
      const m = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.exec(script.slice(i));
      if (m) {
        dollarTag = m[0];
        buf += m[0];
        i += m[0].length;
        continue;
      }
      buf += ch; // lone $ (operator) — treat as a normal character
      i++;
      continue;
    }
    if (ch === ';') {
      pushStatement();
      i++;
      continue;
    }
    buf += ch;
    i++;
  }

  if (inSingle || inDouble || inBlockComment || dollarTag !== null) {
    throw new Error('SQL script ended inside an unterminated string/comment/dollar-quoted block');
  }
  pushStatement();
  return statements;
}

/** True when a chunk contains no executable SQL (only comments / whitespace). */
function isOnlyComments(stmt: string): boolean {
  let s = stmt.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/--[^\n]*/g, '');
  return s.trim().length === 0;
}
