import { sendJson } from '../http.js';
import { sha256hex } from '../sessions.js';

// GET /api/verify-email?token=<raw>. Marks the user verified (first use of a
// valid, unexpired token). Reusing an already-used token is invalid.
export default async function verifyEmail(ctx) {
  if (ctx.req.method !== 'GET') return sendJson(ctx, 405, { error: 'Method not allowed' });

  const raw = (ctx.query.get('token') || '').trim();
  if (!raw) return sendJson(ctx, 400, { error: 'Missing token' });

  const tokenHash = sha256hex(raw);
  const [[row]] = await ctx.pool.query(
    'SELECT id, user_id, expires_at, used_at, (expires_at <= NOW()) AS expired FROM email_verifications WHERE token_hash = ?',
    [tokenHash],
  );
  if (!row || row.used_at || row.expired) {
    return sendJson(ctx, 400, { error: 'Invalid or expired verification link' });
  }

  await ctx.pool.query('UPDATE email_verifications SET used_at = NOW() WHERE id = ?', [row.id]);
  await ctx.pool.query('UPDATE users SET email_verified = 1 WHERE id = ?', [row.user_id]);

  sendJson(ctx, 200, { message: 'Email verified. You can now sign in.', emailVerified: true });
}