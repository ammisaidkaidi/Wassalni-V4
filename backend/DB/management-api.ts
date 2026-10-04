/**
 * management-api.ts — minimal Supabase Management API client.
 *
 * Fallback transport: runs SQL on your project using ONLY the sbp_ personal
 * access token (no database password needed).
 *
 *   GET  /v1/projects                          → list projects
 *   POST /v1/projects/{ref}/database/query     → { "query": "<sql>" } (beta)
 *
 * Docs: https://supabase.com/docs/reference/api/v1-run-a-query
 */

const API_BASE = 'https://api.supabase.com/v1';

export interface SupabaseProjectSummary {
  /** The project ref (used in URLs and API paths). */
  id: string;
  name: string;
  status: string;
  region: string;
  created_at?: string;
}

/**
 * Task 18.2 — live answer to "does this project actually have managed
 * backups / PITR?" straight from Supabase, not an assumption baked into
 * documentation that can silently go stale.
 */
export interface BackupStatus {
  region: string;
  /** Whether WAL-G (the physical-backup/WAL-archiving engine PITR relies on) is active for this project. */
  walgEnabled: boolean;
  /** Whether the Point-in-Time-Recovery add-on is enabled. false on Free-tier / PITR-less projects. */
  pitrEnabled: boolean;
  backups: Array<{ isPhysicalBackup: boolean; status: string; insertedAt: string }>;
  earliestPhysicalBackupUnix?: number;
  latestPhysicalBackupUnix?: number;
}


export class SupabaseManagementApi {
  constructor(private readonly accessToken: string) {
    if (!accessToken) throw new Error('Supabase access token is required');
  }

  private async request<T>(path: string, init: { method?: string; body?: string } = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}${path}`, {
        method: init.method ?? 'GET',
        body: init.body,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      throw new Error(
        `Supabase Management API unreachable (${path}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Supabase Management API ${res.status} ${res.statusText} on ${path}` +
          (body ? ` — ${body.slice(0, 400)}` : ''),
      );
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  listProjects(): Promise<SupabaseProjectSummary[]> {
    return this.request<SupabaseProjectSummary[]>('/projects');
  }

  async getProject(ref: string): Promise<SupabaseProjectSummary> {
    return this.request<SupabaseProjectSummary>(`/projects/${encodeURIComponent(ref)}`);
  }

  /**
   * Execute one SQL statement (or a batch script) on the project's database.
   * Returns the selected rows when the statement produces a result set.
   */
  async runQuery(projectRef: string, query: string): Promise<Record<string, unknown>[]> {
    const out = await this.request<unknown>(
      `/projects/${encodeURIComponent(projectRef)}/database/query`,
      { method: 'POST', body: JSON.stringify({ query }) },
    );
    if (Array.isArray(out)) return out as Record<string, unknown>[];
    if (out && typeof out === 'object' && Array.isArray((out as { rows?: unknown }).rows)) {
      return (out as { rows: Record<string, unknown>[] }).rows;
    }
    return [];
  }

  /** Resolve which project to target: explicit hint, or the only project of the token. */
  async resolveProjectRef(hint?: string): Promise<string> {
    if (hint) {
      await this.getProject(hint); // 404 → clear error for the user
      return hint;
    }
    const projects = await this.listProjects();
    if (projects.length === 0) throw new Error('This Supabase token has no projects.');
    if (projects.length === 1) return projects[0].id;
    const list = projects.map((p) => `  - ${p.id} (${p.name})`).join('\n');
    throw new Error(
      `Multiple Supabase projects found — set SUPABASE_PROJECT_REF in backend/.env to one of:\n${list}`,
    );
  }

  /**
   * Task 18.2 — GET /v1/projects/{ref}/database/backups: Supabase's own
   * record of what it is (or isn't) backing up for this project, including
   * whether the PITR add-on is active. This is the authoritative source —
   * never assume a plan tier/feature from documentation alone.
   */
  async getBackupStatus(projectRef: string): Promise<BackupStatus> {
    const raw = await this.request<{
      region: string;
      walg_enabled: boolean;
      pitr_enabled: boolean;
      backups?: Array<{ is_physical_backup: boolean; status: string; inserted_at: string }>;
      physical_backup_data?: { earliest_physical_backup_date_unix?: number; latest_physical_backup_date_unix?: number };
    }>(`/projects/${encodeURIComponent(projectRef)}/database/backups`);
    return {
      region: raw.region,
      walgEnabled: raw.walg_enabled,
      pitrEnabled: raw.pitr_enabled,
      backups: (raw.backups ?? []).map((b) => ({
        isPhysicalBackup: b.is_physical_backup,
        status: b.status,
        insertedAt: b.inserted_at,
      })),
      earliestPhysicalBackupUnix: raw.physical_backup_data?.earliest_physical_backup_date_unix,
      latestPhysicalBackupUnix: raw.physical_backup_data?.latest_physical_backup_date_unix,
    };
  }

  /**
   * Task 18.2 — restore the project's database to a prior point in time via
   * Supabase's own PITR engine (POST …/database/backups/restore-pitr).
   * Deliberately NOT wired into any HTTP route or admin UI: this is a
   * whole-project, irreversible, highly destructive action with no "drill"
   * mode, and only meaningful once pitr_enabled is actually true (see
   * getBackupStatus) — exists here, documented, as the real call an
   * operator runs by hand during an actual disaster recovery (see
   * backend/BACKUP_RECOVERY.md), not something this app invokes itself.
   */
  async restorePitr(projectRef: string, recoveryTimeTargetUnix: number): Promise<unknown> {
    return this.request<unknown>(`/projects/${encodeURIComponent(projectRef)}/database/backups/restore-pitr`, {
      method: 'POST',
      body: JSON.stringify({ recovery_time_target_unix: recoveryTimeTargetUnix }),
    });
  }
}

