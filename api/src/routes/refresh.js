import { sendJson } from '../http.js';
import { rateLimiter, REFRESH_LIMIT, REFRESH_WINDOW_MS } from '../rateLimit.js';
import {
  getRefreshTokenFromRequest, sha256hex, setRefreshCookie,
  issueRefreshToken, issueAccessToken, clientIp,
} from '../sessions.js';
import { accessEnvelope } from './login.js';

export default async function refresh(ctx) {
  if (ctx.req.method !== 'POST') return sendJson(ctx, 405, { error: 'Method not allowed' });

  const ip = clientIp(ctx.req);
  const raw = getRefreshTokenFromRequest(ctx.req);

  const limit = rateLimiter.check(`refresh:${ip}`, REFRESH_LIMIT, REFRESH_WINDOW_MS);
  if (!limit.ok) {
    return sendJson(ctx, 429, {
      error: 'Too many session renewals. Please try again later.',
      code: 'RATE_LIMITED',
    }, { 'Retry-After': String(limit.retryAfter) });
  }
  rateLimiter.hit(`refresh:${ip}`, REFRESH_WINDOW_MS);

  if (!raw) {
    return sendJson(ctx, 401, { error: 'Missing or invalid session', code: 'SESSION_INVALID' });
  }

  const tokenHash = sha256hex(raw);
  const [[row]] = await ctx.pool.query(
    'SELECT id, user_id, family_id, expires_at, used_at, revoked_at, (expires_at <= NOW()) AS expired FROM refresh_tokens WHERE token_hash = ?',
    [tokenHash],
  );

  if (!row) {
    return sendJson(ctx, 401, { error: 'Invalid or expired session', code: 'SESSION_INVALID' });
  }

  // REUSE DETECTION: a token that has already been rotated was stolen or
  // duplicated — revoke the WHOLE family (all tokens of this login).
  if (row.used_at) {
    await ctx.pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ?', [row.family_id]);
    return sendJson(ctx, 401, { error: 'Session has been revoked', code: 'SESSION_REVOKED' });
  }

  if (row.revoked_at || row.expired) {
    return sendJson(ctx, 401, { error: 'Invalid or expired session', code: 'SESSION_INVALID' });
  }

  const [[user]] = await ctx.pool.query(
    'SELECT id, email, name, role, email_verified FROM users WHERE id = ?',
    [row.user_id],
  );
  if (!user) {
    return sendJson(ctx, 401, { error: 'Invalid or expired session', code: 'SESSION_INVALID' });
  }

  // Rotate: mark the presented token used, hand out a fresh one in the same
  // family (replaying the OLD token now triggers family revocation).
  await ctx.pool.query('UPDATE refresh_tokens SET used_at = NOW() WHERE id = ?', [row.id]);
  const { raw: newRaw } = await issueRefreshToken(ctx.pool, user.id, { familyId: row.family_id });
  setRefreshCookie(ctx.res, newRaw);

  sendJson(ctx, 200, accessEnvelope(user, issueAccessToken(user, ctx.config.jwtSecret)));
}