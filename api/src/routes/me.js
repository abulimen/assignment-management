import { guard, sendJson, sendError } from '../http.js';

export default async function me(ctx) {
  if (ctx.req.method !== 'GET') return sendError(ctx, 405, 'Method not allowed');
  const auth = guard(ctx);
  if (!auth) return;

  const [rows] = await ctx.pool.query(
    'SELECT id, email, name, role, email_verified FROM users WHERE id = ?',
    [auth.sub],
  );
  const user = rows[0];
  if (!user) return sendError(ctx, 404, 'User not found');

  sendJson(ctx, 200, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: !!user.email_verified,
    },
  });
}