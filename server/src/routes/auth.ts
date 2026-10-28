import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { clearSessionCookie, requireAuth, setSessionCookie, signSession } from '../auth.js';
import { query } from '../db.js';
import { conflict, unauthorized } from '../errors.js';
import { loginSchema, registerSchema } from '../validation.js';

export const authRouter = Router();

const BCRYPT_ROUNDS = 12;

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
}

authRouter.post('/register', async (req, res) => {
  const { email, password } = registerSchema.parse(req.body);

  const existing = await query<{ id: string }>(
    'SELECT id FROM users WHERE lower(email) = lower($1)',
    [email],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw conflict('An account with that email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const inserted = await query<{ id: string; email: string }>(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email`,
    [email, passwordHash],
  );

  const user = inserted.rows[0];
  setSessionCookie(res, signSession(user));
  res.status(201).json({ user });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const found = await query<UserRow>(
    'SELECT id, email, password_hash FROM users WHERE lower(email) = lower($1)',
    [email],
  );

  const row = found.rows[0];
  // Always run a comparison so response timing does not reveal whether the email exists.
  const hash =
    row?.password_hash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, hash);

  if (!row || !ok) {
    throw unauthorized('Incorrect email or password');
  }

  const user = { id: row.id, email: row.email };
  setSessionCookie(res, signSession(user));
  res.json({ user });
});

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
