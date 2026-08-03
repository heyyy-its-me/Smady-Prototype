import { Pool, type PoolConfig } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __leadPrototypeDbPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __leadPrototypeSchemaPromise: Promise<void> | undefined;
}

function encodeCredentialPart(value: string): string {
  try {
    return encodeURIComponent(decodeURIComponent(value));
  } catch {
    return encodeURIComponent(value);
  }
}

/**
 * Makes DATABASE_URL resilient to unescaped reserved password characters
 * (notably `#`, which otherwise starts a URI fragment). Individual DB_*
 * variables remain the preferred option when a password contains symbols.
 */
function normalizeDatabaseUrl(value: string): string {
  const schemeEnd = value.indexOf('://');
  const authEnd = value.lastIndexOf('@');
  if (schemeEnd === -1 || authEnd <= schemeEnd + 3) return value;

  const credentials = value.slice(schemeEnd + 3, authEnd);
  const separator = credentials.indexOf(':');
  if (separator === -1) return value;

  const normalized = `${value.slice(0, schemeEnd + 3)}${encodeCredentialPart(credentials.slice(0, separator))}:${encodeCredentialPart(credentials.slice(separator + 1))}${value.slice(authEnd)}`;
  if (normalized !== value) console.warn('DATABASE_URL credentials contained reserved URL characters and were normalized.');
  return normalized;
}

function databaseConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) return { connectionString: normalizeDatabaseUrl(connectionString), max: 3, ssl: process.env.DATABASE_SSL === 'false' ? undefined : { rejectUnauthorized: false } };

  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
    throw new Error('Database configuration is missing. Set DATABASE_URL or DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD.');
  }
  return { host: DB_HOST, port: DB_PORT ? Number(DB_PORT) : 5432, database: DB_NAME, user: DB_USER, password: DB_PASSWORD, max: 3, ssl: process.env.DATABASE_SSL === 'false' ? undefined : { rejectUnauthorized: false } };
}

export function getDatabase(): Pool {
  if (!global.__leadPrototypeDbPool) global.__leadPrototypeDbPool = new Pool(databaseConfig());
  return global.__leadPrototypeDbPool;
}

export async function ensureDatabaseSchema(): Promise<void> {
  if (!global.__leadPrototypeSchemaPromise) {
    global.__leadPrototypeSchemaPromise = (async () => {
      await getDatabase().query(`
        CREATE TABLE IF NOT EXISTS workflow_executions (
          request_id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'processing',
          logs JSONB NOT NULL DEFAULT '[]'::jsonb, progress_events JSONB NOT NULL DEFAULT '[]'::jsonb,
          node_status JSONB NOT NULL DEFAULT '{}'::jsonb, final_result JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
        );
        CREATE TABLE IF NOT EXISTS lead_results (
          request_id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'processing', total_count INTEGER NOT NULL DEFAULT 0,
          leads JSONB NOT NULL DEFAULT '[]'::jsonb, error TEXT, completed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS outreach_runs (
          request_id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'processing', completed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS outreach_updates (
          request_id TEXT NOT NULL REFERENCES outreach_runs(request_id) ON DELETE CASCADE, lead_id TEXT NOT NULL, status TEXT NOT NULL,
          email TEXT, subject TEXT, personalization_hook TEXT, error TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (request_id, lead_id)
        );
        CREATE INDEX IF NOT EXISTS workflow_executions_status_idx ON workflow_executions (status, updated_at DESC);
        CREATE INDEX IF NOT EXISTS outreach_updates_request_idx ON outreach_updates (request_id, updated_at);
      `);
    })().catch((error) => { global.__leadPrototypeSchemaPromise = undefined; throw error; });
  }
  await global.__leadPrototypeSchemaPromise;
}
