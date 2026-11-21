import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'agentic-pl-dev-secret-change-in-prod';

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRole = decoded.role ?? 'user';
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
