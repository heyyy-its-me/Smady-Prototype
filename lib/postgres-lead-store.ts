import { ensureDatabaseSchema, getDatabase } from '@/lib/database';
import { updateExecution } from '@/lib/execution-store';

export interface StoredLeadResult {
  leads: Record<string, unknown>[];
  total_count: number;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  completedAt?: number;
}

export async function initLeadResult(requestId: string): Promise<void> {
  await ensureDatabaseSchema();
  await getDatabase().query(`INSERT INTO lead_results (request_id) VALUES ($1) ON CONFLICT (request_id) DO NOTHING`, [requestId]);
}

export async function updateLeadResult(requestId: string, data: { leads: Record<string, unknown>[]; total_count: number }): Promise<void> {
  await initLeadResult(requestId);
  await getDatabase().query(`UPDATE lead_results SET status = 'completed', leads = $2::jsonb, total_count = $3, error = NULL, completed_at = NOW(), updated_at = NOW() WHERE request_id = $1`, [requestId, JSON.stringify(data.leads), data.total_count]);
  await updateExecution(requestId, 'leads', 'completed', { total_count: data.total_count, leads: data.leads });
}

export async function failLeadResult(requestId: string, error: string): Promise<void> {
  await initLeadResult(requestId);
  await getDatabase().query(`UPDATE lead_results SET status = 'failed', error = $2, completed_at = NOW(), updated_at = NOW() WHERE request_id = $1`, [requestId, error]);
  await updateExecution(requestId, 'leads', 'failed', undefined, error);
}

export async function getLeadResult(requestId: string): Promise<StoredLeadResult | null> {
  await ensureDatabaseSchema();
  const { rows } = await getDatabase().query(`SELECT status, leads, total_count, error, completed_at FROM lead_results WHERE request_id = $1`, [requestId]);
  const row = rows[0];
  if (!row) return null;
  return { status: row.status, leads: row.leads ?? [], total_count: row.total_count, error: row.error ?? undefined, completedAt: row.completed_at ? new Date(row.completed_at).getTime() : undefined };
}
