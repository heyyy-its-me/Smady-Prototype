import { ensureDatabaseSchema, getDatabase } from '@/lib/database';
import { appendExecutionEvent, initExecution, updateExecution } from '@/lib/execution-store';

export interface OutreachUpdate {
  lead_id: string;
  status: 'emailed' | 'failed';
  email?: string;
  subject?: string;
  personalization_hook?: string;
  error?: string;
  updated_at: number;
}

async function initOutreachRun(requestId: string): Promise<void> {
  await ensureDatabaseSchema();
  await getDatabase().query(`INSERT INTO outreach_runs (request_id) VALUES ($1) ON CONFLICT (request_id) DO NOTHING`, [requestId]);
  await initExecution(requestId, 'outreach');
}

export async function recordOutreachUpdate(requestId: string, update: Omit<OutreachUpdate, 'updated_at'>): Promise<void> {
  await initOutreachRun(requestId);
  await getDatabase().query(
    `INSERT INTO outreach_updates (request_id, lead_id, status, email, subject, personalization_hook, error) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (request_id, lead_id) DO UPDATE SET status = EXCLUDED.status, email = EXCLUDED.email, subject = EXCLUDED.subject, personalization_hook = EXCLUDED.personalization_hook, error = EXCLUDED.error, updated_at = NOW()`,
    [requestId, update.lead_id, update.status, update.email ?? null, update.subject ?? null, update.personalization_hook ?? null, update.error ?? null],
  );
  await appendExecutionEvent(requestId, { type: 'outreach-progress', lead_id: update.lead_id, status: update.status }, `Outreach ${update.status} for lead ${update.lead_id}`);
}

export async function completeOutreachRun(requestId: string): Promise<void> {
  await initOutreachRun(requestId);
  await getDatabase().query(`UPDATE outreach_runs SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE request_id = $1`, [requestId]);
  const run = await getOutreachRun(requestId);
  await updateExecution(requestId, 'outreach', 'completed', run);
}

export async function getOutreachRun(requestId: string): Promise<{ status: 'processing' | 'completed'; updates: OutreachUpdate[] }> {
  await initOutreachRun(requestId);
  const db = getDatabase();
  const [runResult, updatesResult] = await Promise.all([
    db.query(`SELECT status FROM outreach_runs WHERE request_id = $1`, [requestId]),
    db.query(`SELECT lead_id, status, email, subject, personalization_hook, error, updated_at FROM outreach_updates WHERE request_id = $1 ORDER BY updated_at`, [requestId]),
  ]);
  return { status: runResult.rows[0].status, updates: updatesResult.rows.map((row) => ({ ...row, updated_at: new Date(row.updated_at).getTime() })) };
}
