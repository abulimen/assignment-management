import bcrypt from 'bcrypt';
import { sendJson, sendError, missingField } from '../http.js';
import { sha256hex } from '../sessions.js';
import { revokeAllUserRefreshTokens } from '../sessions.js';

const BCRYPT_COST = 12;

// POST /api/reset-password {token, password}
// Validates expiry + first-use, checks strength (>= 8), updates the hash,
// revokes ALL the user's refresh tokens (blow away existing sessions).
export default async function resetPassword(ctx) {
  if (ctx.req.method !== 'POST') return sendError(ctx, 405, 'Method not allowed');
  const data = ctx.body;

  for (const f of ['token', 'password']) {
    if (missingField(data, f)) return sendError(ctx, 422, `Missing required field: ${f}`);
  }
  const password = String(data.password);
  if (password.length < 8) return sendError(ctx, 422, 'Password must be at least 8 characters');

  const raw = String(data.token).trim();
  const [[row]] = await ctx.pool.query(
    'SELECT id, user_id, expires_at, used_at, (expires_at <= NOW()) AS expired FROM password_resets WHERE token_hash = ?',
    [sha256hex(raw)],
  );

  if (!row || row.used_at || row.expired) {
    return sendError(ctx, 400, 'Invalid or expired reset link');
  }

  const hash = await bcrypt.hash(password, BCRYPT_COST);
  await ctx.pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, row.user_id]);
  await ctx.pool.query('UPDATE password_resets SET used_at = NOW() WHERE id = ?', [row.id]);

  // Invalidate every existing session for this user.
  await revokeAllUserRefreshTokens(ctx.pool, row.user_id);

  sendJson(ctx, 200, { message: 'Password updated. You can now sign in.' });
}