import bcrypt from 'bcryptjs';
import { signJwt } from '@am/core';
import { sendJson, sendError, missingField } from '../http.js';

export default async function login(ctx) {
  if (ctx.req.method !== 'POST') return sendError(ctx, 405, 'Method not allowed');
  const data = ctx.body;

  for (const f of ['email', 'password']) {
    if (missingField(data, f)) return sendError(ctx, 422, `Missing required field: ${f}`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return sendError(ctx, 422, 'Invalid email address');

  const [rows] = await ctx.pool.query(
    'SELECT id, email, password, name, role FROM users WHERE email = ?',
    [data.email],
  );
  const user = rows[0];
  if (!user || !bcrypt.compareSync(String(data.password), user.password)) {
    return sendError(ctx, 401, 'Invalid email or password');
  }

  const token = signJwt({ sub: user.id, role: user.role }, ctx.config.jwtSecret);
  sendJson(ctx, 200, {
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}