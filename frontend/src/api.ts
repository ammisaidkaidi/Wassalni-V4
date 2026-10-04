export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// Session token carried as a `?sid=` URL query parameter instead of a cookie
// (some browsers in use here don't support cookies at all). The token is
// handed back by /api/auth/verify-2fa and kept in localStorage so it survives
// reloads; every request below re-attaches it to the URL.
const SESSION_STORAGE_KEY = 'wassalni_sid';

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(SESSION_STORAGE_KEY, token);
    else localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // storage unavailable (private mode, etc.) — session just won't persist across reloads.
  }
}

function withSessionParam(path: string): string {
  const token = getSessionToken();
  if (!token) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}sid=${encodeURIComponent(token)}`;
}

/** URL for a session-authenticated non-JSON resource (e.g. a KYC file), usable directly in an <a href>/<img src>. */
export function fileUrl(path: string): string {
  return withSessionParam(path);
}

/** Multipart upload (e.g. a KYC document) — browser sets the multipart boundary itself, so no Content-Type header here. */
export async function apiUpload<T = unknown>(path: string, file: File, fields: Record<string, string> = {}): Promise<T> {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append('file', file);
  const res = await fetch(withSessionParam(path), { method: 'POST', body: form, credentials: 'same-origin' });
  const data = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
  if (!res.ok) {
    throw new ApiError(data.error?.message ?? `Erreur ${res.status}`, data.error?.code ?? 'UNKNOWN', res.status);
  }
  return data as T;
}

/** JSON fetch helper — session sent as a `?sid=` query param, throws ApiError on !ok. */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(withSessionParam(path), {
    method: opts.method ?? 'GET',
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  const data = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
  if (!res.ok) {
    throw new ApiError(data.error?.message ?? `Erreur ${res.status}`, data.error?.code ?? 'UNKNOWN', res.status);
  }
  return data as T;
}

export function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { dateStyle: 'medium' });
}
