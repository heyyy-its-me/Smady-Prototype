import { ensureDatabaseSchema, getDatabase } from '@/lib/database';

type JsonObject = Record<string, unknown>;

export async function initExecution(requestId: string, agentId: string, message = 'Workflow triggered'): Promise<void> {
  await ensureDatabaseSchema();
  const now = Date.now();
  await getDatabase().query(
    `INSERT INTO workflow_executions (request_id, agent_id, logs, progress_events, node_status) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb) ON CONFLICT (request_id) DO NOTHING`,
    [requestId, agentId, JSON.stringify([{ timestamp: now, level: 'info', message }]), JSON.stringify([{ timestamp: now, type: 'execution-start', message }]), JSON.stringify({ workflow: { status: 'running', updated_at: now } })],
  );
}

export async function appendExecutionEvent(requestId: string, event: JsonObject, logMessage?: string): Promise<void> {
  await ensureDatabaseSchema();
  const timestamp = typeof event.timestamp === 'number' ? event.timestamp : Date.now();
  const log = logMessage ? JSON.stringify([{ timestamp, level: 'info', message: logMessage }]) : null;
  await getDatabase().query(
    `UPDATE workflow_executions SET progress_events = progress_events || $2::jsonb, logs = CASE WHEN $3::jsonb IS NULL THEN logs ELSE logs || $3::jsonb END, updated_at = NOW() WHERE request_id = $1`,
    [requestId, JSON.stringify([{ ...event, timestamp }]), log],
  );
}

export async function updateExecution(requestId: string, agentId: string, status: 'processing' | 'completed' | 'failed', finalResult?: unknown, error?: string): Promise<void> {
  await initExecution(requestId, agentId);
  const now = Date.now();
  await getDatabase().query(
    `UPDATE workflow_executions SET status = $2, final_result = COALESCE($3::jsonb, final_result), node_status = node_status || $4::jsonb, progress_events = progress_events || $5::jsonb, logs = logs || $6::jsonb, updated_at = NOW(), completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN NOW() ELSE completed_at END WHERE request_id = $1`,
    [requestId, status, finalResult === undefined ? null : JSON.stringify(finalResult), JSON.stringify({ workflow: { status: status === 'processing' ? 'running' : status, updated_at: now } }), JSON.stringify([{ timestamp: now, type: `execution-${status}`, error: error ?? null }]), JSON.stringify([{ timestamp: now, level: status === 'failed' ? 'error' : 'info', message: error ?? `Workflow ${status}` }])],
  );
}
