import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
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
      role TEXT NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

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

    CREATE TABLE IF NOT EXISTS user_ai_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL DEFAULT 'openrouter',
      base_url TEXT NOT NULL DEFAULT 'https://openrouter.ai/api/v1',
      model TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
      api_key_encrypted TEXT NOT NULL DEFAULT '',
      temperature DOUBLE PRECISION NOT NULL DEFAULT 0.2,
      system_prompt TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Ensure ian@ianloe.net is promoted to admin if already present
  await pool.query(`UPDATE users SET role = 'admin' WHERE email = 'ian@ianloe.net'`);

  // Seed or promote initial admin from environment variables (.env)
  const adminEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? '';
  const adminName = (process.env.ADMIN_NAME ?? 'Administrator').trim();

  if (adminEmail && adminPassword) {
    const existing = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );
    if (existing.rows.length > 0) {
      await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [adminEmail]);
    } else {
      const id = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        `INSERT INTO users (id, email, name, password_hash, role)
         VALUES ($1, $2, $3, $4, 'admin')`,
        [id, adminEmail, adminName, passwordHash]
      );
      console.log(`Seeded initial admin user: ${adminEmail}`);
    }
  }
}
