import { sendJson, sendError, missingField } from '../http.js';
import { rateLimiter, FORGOT_LIMIT, FORGOT_WINDOW_MS } from '../rateLimit.js';
import { sha256hex, randomToken, clientIp } from '../sessions.js';
import { sendPasswordResetEmail } from '../mailer.js';
import { publicBaseUrl } from './register.js';

// POST /api/forgot-password {email} → always 200, no user enumeration.
// Mints a 1h token only when the account exists.
export default async function forgotPassword(ctx) {
  if (ctx.req.method !== 'POST') return sendError(ctx, 405, 'Method not allowed');
  const data = ctx.body;

  for (const f of ['email']) {
    if (missingField(data, f)) return sendError(ctx, 422, `Missing required field: ${f}`);
  }

  const email = String(data.email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(ctx, 422, 'Invalid email address');

  const ip = clientIp(ctx.req);
  const limit = rateLimiter.check(`forgot:${ip}:${email}`, FORGOT_LIMIT, FORGOT_WINDOW_MS);
  if (!limit.ok) {
    return sendJson(ctx, 429, {
      error: 'Too many requests. Please wait before trying again.',
      code: 'RATE_LIMITED',
    }, { 'Retry-After': String(limit.retryAfter) });
  }
  rateLimiter.hit(`forgot:${ip}:${email}`, FORGOT_WINDOW_MS);

  const [[user]] = await ctx.pool.query(
    'SELECT id, email, name FROM users WHERE email = ?',
    [email],
  );

  if (user) {
    const rawToken = randomToken();
    await ctx.pool.query(
      "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))",
      [user.id, sha256hex(rawToken)],
    );
    const url = `${publicBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await sendPasswordResetEmail({ to: user.email, name: user.name, url });
  }

  sendJson(ctx, 200, {
    message: 'If that email address is registered, a password reset link is on its way.',
  });
}