import bcrypt from 'bcrypt';
import { sendJson, sendError, missingField } from '../http.js';
import { rateLimiter, LOGIN_LIMIT, LOGIN_WINDOW_MS, LOGIN_LOCK_MS } from '../rateLimit.js';
import {
  issueAccessToken, issueRefreshToken, setRefreshCookie, clientIp,
} from '../sessions.js';

// Response envelope shared by both login and refresh.
export function accessEnvelope(user, accessToken) {
  return {
    accessToken,
    expiresIn: 15 * 60,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: !!user.email_verified },
  };
}

export default async function login(ctx) {
  if (ctx.req.method !== 'POST') return sendError(ctx, 405, 'Method not allowed');
  const data = ctx.body;
  const ip = clientIp(ctx.req);

  for (const f of ['email', 'password']) {
    if (missingField(data, f)) return sendError(ctx, 422, `Missing required field: ${f}`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return sendError(ctx, 422, 'Invalid email address');

  const email = String(data.email);
  const lockKey = `login-lock:${email}`;
  const windowKey = `login:${ip}:${email}`;

  // Identity lockout (exponential backoff) takes precedence: a CORRECT
  // password is still refused while the identity is locked.
  const locked = rateLimiter.isLocked(lockKey);
  if (locked) {
    return sendJson(ctx, 429, {
      error: `Too many failed attempts. Try again in ${locked} second(s).`,
      code: 'RATE_LIMITED',
    }, { 'Retry-After': String(locked) });
  }

  // Failure-window check: ≥5 failures in the window locks the identity.
  const windowCheck = rateLimiter.check(windowKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  if (!windowCheck.ok) {
    const retry = rateLimiter.lock(lockKey, LOGIN_LOCK_MS);
    return sendJson(ctx, 429, {
      error: `Too many failed attempts. Try again in ${retry} second(s).`,
      code: 'RATE_LIMITED',
    }, { 'Retry-After': String(retry) });
  }

  const [rows] = await ctx.pool.query(
    'SELECT id, email, password, name, role, email_verified FROM users WHERE email = ?',
    [email],
  );
  const user = rows[0];
  if (!user) {
    rateLimiter.hit(windowKey, LOGIN_WINDOW_MS);
    return sendError(ctx, 401, 'Invalid email or password');
  }

  const ok = await bcrypt.compare(String(data.password), user.password);
  if (!ok) {
    rateLimiter.hit(windowKey, LOGIN_WINDOW_MS);
    return sendError(ctx, 401, 'Invalid email or password');
  }

  if (!user.email_verified) {
    return sendJson(ctx, 403, {
      error: 'Please verify your email address before signing in.',
      code: 'EMAIL_UNVERIFIED',
    });
  }

  // Success → clear both failure counters and the identity lock.
  rateLimiter.clear(lockKey);
  rateLimiter.clear(windowKey);

  const { raw } = await issueRefreshToken(ctx.pool, user.id);
  setRefreshCookie(ctx.res, raw);

  sendJson(ctx, 200, accessEnvelope(user, issueAccessToken(user, ctx.config.jwtSecret)));
}