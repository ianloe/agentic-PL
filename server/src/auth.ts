import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const DEV_FALLBACK_SECRET = 'agentic-pl-dev-secret-change-in-prod';
const JWT_SECRET = process.env.JWT_SECRET ?? DEV_FALLBACK_SECRET;

if (process.env.NODE_ENV === 'production' && JWT_SECRET === DEV_FALLBACK_SECRET) {
  console.warn(
    'SECURITY WARNING: JWT_SECRET is using the default fallback value. Set a strong JWT_SECRET in .env.'
  );
}

export type UserRole = 'admin' | 'user';

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
  userRole?: UserRole;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthPayload;
    const result = await pool.query<{ id: string; email: string; role: UserRole }>(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );
    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Account no longer exists' });
      return;
    }

    req.userId = user.id;
    req.userEmail = user.email;
    req.userRole = user.role === 'admin' ? 'admin' : 'user';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Administrator privileges required' });
    return;
  }
  next();
}
