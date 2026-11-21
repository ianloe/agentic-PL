import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import crypto from 'node:crypto';
import {
  type AuthenticatedRequest,
  type UserRole,
  requireAdmin,
  requireAuth,
  signToken,
} from './auth.js';
import { initDb, pool } from './db.js';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, db: 'connected' });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// Public registration disabled to prevent bot signups
app.post('/api/auth/register', (_req, res) => {
  res.status(403).json({
    error: 'Public registration is disabled. Please contact an administrator for an account.',
  });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  try {
    const result = await pool.query<{
      id: string;
      email: string;
      name: string;
      role: UserRole;
      password_hash: string;
    }>('SELECT id, email, name, role, password_hash FROM users WHERE email = $1', [email]);

    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const role: UserRole = user.role === 'admin' ? 'admin' : 'user';
    const token = signToken({ userId: user.id, email: user.email, role });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role },
    });
  } catch {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// Current user (reads latest role from DB)
app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query<{
      id: string;
      email: string;
      name: string;
      role: UserRole;
    }>('SELECT id, email, name, role FROM users WHERE id = $1', [req.userId]);
    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user });
  } catch {
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

// Admin: list all users
app.get('/api/admin/users', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const result = await pool.query<{
      id: string;
      email: string;
      name: string;
      role: UserRole;
      created_at: string;
    }>('SELECT id, email, name, role, created_at FROM users ORDER BY created_at ASC');
    res.json({ users: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to list users.' });
  }
});

// Admin: create a user manually
app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const name = String(req.body?.name ?? '').trim();
  const password = String(req.body?.password ?? '');
  const role: UserRole = req.body?.role === 'admin' ? 'admin' : 'user';

  if (!email || !email.includes('@')) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const displayName = name || email.split('@')[0];
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const inserted = await pool.query(
      `INSERT INTO users (id, email, name, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, created_at`,
      [id, email, displayName, passwordHash, role]
    );
    res.status(201).json({ user: inserted.rows[0] });
  } catch (err: unknown) {
    const pgErr = err as { code?: string };
    if (pgErr.code === '23505') {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }
    res.status(500).json({ error: 'Failed to create user.' });
  }
});

// Admin: update user role
app.patch('/api/admin/users/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const role: UserRole = req.body?.role === 'admin' ? 'admin' : 'user';
  if (req.params.id === req.userId && role !== 'admin') {
    res.status(400).json({ error: 'You cannot remove your own administrator role.' });
    return;
  }

  try {
    const updated = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role, created_at`,
      [role, req.params.id]
    );
    if (!updated.rows[0]) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user: updated.rows[0] });
  } catch {
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

// Admin: delete user
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  if (req.params.id === req.userId) {
    res.status(400).json({ error: 'You cannot delete your own account.' });
    return;
  }

  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
});

// Stored configurations
app.get('/api/configurations', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, config_json, updated_at FROM stored_configurations WHERE user_id = $1 ORDER BY updated_at DESC',
      [req.userId]
    );
    res.json({ configurations: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch configurations.' });
  }
});

app.post('/api/configurations', requireAuth, async (req: AuthenticatedRequest, res) => {
  const name = String(req.body?.name ?? '').trim();
  const configJson = req.body?.config;
  const existingId = req.body?.id ? String(req.body.id) : null;

  if (!name) {
    res.status(400).json({ error: 'Configuration name is required.' });
    return;
  }
  if (!configJson || typeof configJson !== 'object') {
    res.status(400).json({ error: 'Configuration payload is required.' });
    return;
  }

  try {
    if (existingId) {
      const updated = await pool.query(
        'UPDATE stored_configurations SET name = $1, config_json = $2, updated_at = NOW() WHERE id = $3 AND user_id = $4 RETURNING id, name, config_json, updated_at',
        [name, JSON.stringify(configJson), existingId, req.userId]
      );
      if (updated.rows[0]) {
        res.json({ configuration: updated.rows[0] });
        return;
      }
    }

    const id = crypto.randomUUID();
    const inserted = await pool.query(
      'INSERT INTO stored_configurations (id, user_id, name, config_json) VALUES ($1, $2, $3, $4) RETURNING id, name, config_json, updated_at',
      [id, req.userId, name, JSON.stringify(configJson)]
    );
    res.status(201).json({ configuration: inserted.rows[0] });
  } catch {
    res.status(500).json({ error: 'Failed to save configuration.' });
  }
});

app.delete('/api/configurations/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM stored_configurations WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Configuration not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete configuration.' });
  }
});

// Past assessments
app.get('/api/assessments', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, scope, currency, exchange_rate, summary_metrics, snapshot_json, created_at FROM past_assessments WHERE user_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json({ assessments: result.rows });
  } catch {
    res.status(500).json({ error: 'Failed to fetch past assessments.' });
  }
});

app.post('/api/assessments', requireAuth, async (req: AuthenticatedRequest, res) => {
  const title = String(req.body?.title ?? '').trim();
  const scope = req.body?.scope === 'agent' ? 'agent' : 'portfolio';
  const currency = req.body?.currency === 'USD' ? 'USD' : 'SGD';
  const exchangeRate = Number(req.body?.exchangeRate ?? 1.35);
  const summaryMetrics = req.body?.summaryMetrics;
  const snapshotJson = req.body?.snapshot;

  if (!title) {
    res.status(400).json({ error: 'Assessment title is required.' });
    return;
  }
  if (!summaryMetrics || !snapshotJson) {
    res.status(400).json({ error: 'Assessment summary and snapshot are required.' });
    return;
  }

  const id = crypto.randomUUID();
  try {
    const inserted = await pool.query(
      `INSERT INTO past_assessments
        (id, user_id, title, scope, currency, exchange_rate, summary_metrics, snapshot_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, scope, currency, exchange_rate, summary_metrics, snapshot_json, created_at`,
      [
        id,
        req.userId,
        title,
        scope,
        currency,
        exchangeRate,
        JSON.stringify(summaryMetrics),
        JSON.stringify(snapshotJson),
      ]
    );
    res.status(201).json({ assessment: inserted.rows[0] });
  } catch {
    res.status(500).json({ error: 'Failed to save assessment.' });
  }
});

app.delete('/api/assessments/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM past_assessments WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Assessment not found.' });
      return;
    }
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete assessment.' });
  }
});

async function start(): Promise<void> {
  let retries = 10;
  while (retries > 0) {
    try {
      await initDb();
      break;
    } catch (err) {
      retries -= 1;
      if (retries === 0) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  app.listen(PORT, () => {
    console.log(`Agentic P&L API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});
