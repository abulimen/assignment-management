import bcrypt from 'bcryptjs';
import { signJwt } from '@am/core';
import { sendJson, sendError, missingField } from '../http.js';

export default async function register(ctx) {
  if (ctx.req.method !== 'POST') return sendError(ctx, 405, 'Method not allowed');
  const data = ctx.body;

  for (const f of ['email', 'password', 'name', 'role']) {
    if (missingField(data, f)) return sendError(ctx, 422, `Missing required field: ${f}`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return sendError(ctx, 422, 'Invalid email address');
  if (!['lecturer', 'student'].includes(data.role)) return sendError(ctx, 422, 'Role must be lecturer or student');
  if (String(data.password).length < 8) return sendError(ctx, 422, 'Password must be at least 8 characters');

  const [existing] = await ctx.pool.query('SELECT id FROM users WHERE email = ?', [data.email]);
  if (existing.length) return sendError(ctx, 409, 'Email already registered');

  const hash = bcrypt.hashSync(String(data.password), 10);
  const [r] = await ctx.pool.query(
    'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
    [data.email, hash, data.name, data.role],
  );
  const userId = r.insertId;
  const token = signJwt({ sub: userId, role: data.role }, ctx.config.jwtSecret);

  sendJson(ctx, 201, {
    token,
    user: { id: userId, email: data.email, name: data.name, role: data.role },
  });
}