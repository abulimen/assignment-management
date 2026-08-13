import { sendJson, sendError, missingField } from '../http.js';
import { rateLimiter, RESEND_LIMIT, RESEND_WINDOW_MS } from '../rateLimit.js';
import { sha256hex, randomToken, clientIp } from '../sessions.js';
import { sendVerificationEmail } from '../mailer.js';
import { publicBaseUrl } from './register.js';

// POST /api/resend-verification {email}
// Always answers the same generous message (no account enumeration). Reissues
// a fresh 24h link only when the user exists and is still unverified.
export default async function resendVerification(ctx) {
  if (ctx.req.method !== 'POST') return sendError(ctx, 405, 'Method not allowed');
  const data = ctx.body;
  const email = String((data && data.email) || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendError(ctx, 422, 'Invalid email address');
  }

  const ip = clientIp(ctx.req);
  const limit = rateLimiter.check(`resend:${ip}:${email}`, RESEND_LIMIT, RESEND_WINDOW_MS);
  if (!limit.ok) {
    return sendJson(ctx, 429, {
      error: 'Too many requests. Please wait before trying again.',
      code: 'RATE_LIMITED',
    }, { 'Retry-After': String(limit.retryAfter) });
  }
  rateLimiter.hit(`resend:${ip}:${email}`, RESEND_WINDOW_MS);

  const [[user]] = await ctx.pool.query(
    'SELECT id, email, name, email_verified FROM users WHERE email = ?',
    [email],
  );

  if (user && !user.email_verified) {
    const rawToken = randomToken();
    await ctx.pool.query(
      "INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))",
      [user.id, sha256hex(rawToken)],
    );
    const url = `${publicBaseUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;
    await sendVerificationEmail({ to: user.email, name: user.name, url });
  }

  sendJson(ctx, 200, {
    message: 'If that email address is registered and unverified, a fresh verification link is on its way.',
  });
}