import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://agentic:agentic@localhost:5432/agentic_pl';

export const pool = new Pool({
  connectionString,
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS stored_configurations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      config_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_stored_configurations_user
      ON stored_configurations(user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS past_assessments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      scope TEXT NOT NULL,
      currency TEXT NOT NULL,
      exchange_rate DOUBLE PRECISION NOT NULL,
      summary_metrics JSONB NOT NULL,
      snapshot_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_past_assessments_user
      ON past_assessments(user_id, created_at DESC);
  `);
}
