import bcrypt from 'bcrypt';
import { sendJson, sendError, missingField } from '../http.js';
import { rateLimiter, REGISTER_LIMIT, REGISTER_WINDOW_MS } from '../rateLimit.js';
import { sha256hex, randomToken, clientIp } from '../sessions.js';
import { sendVerificationEmail } from '../mailer.js';

const BCRYPT_COST = 12;

export function publicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || 'http://localhost:3000';
}

export default async function register(ctx) {
  if (ctx.req.method !== 'POST') return sendError(ctx, 405, 'Method not allowed');
  const data = ctx.body;
  const ip = clientIp(ctx.req);

  // 10 registrations / hour / IP.
  const limit = rateLimiter.check(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (!limit.ok) {
    return sendJson(ctx, 429, {
      error: 'Too many sign-up attempts from this address. Please try again later.',
      code: 'RATE_LIMITED',
    }, { 'Retry-After': String(limit.retryAfter) });
  }

  for (const f of ['email', 'password', 'name', 'role']) {
    if (missingField(data, f)) return sendError(ctx, 422, `Missing required field: ${f}`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return sendError(ctx, 422, 'Invalid email address');
  if (!['lecturer', 'student'].includes(data.role)) return sendError(ctx, 422, 'Role must be lecturer or student');
  if (String(data.password).length < 8) return sendError(ctx, 422, 'Password must be at least 8 characters');

  const [existing] = await ctx.pool.query('SELECT id FROM users WHERE email = ?', [String(data.email)]);
  if (existing.length) return sendError(ctx, 409, 'Email already registered');

  const hash = await bcrypt.hash(String(data.password), BCRYPT_COST);
  const [r] = await ctx.pool.query(
    'INSERT INTO users (email, password, name, role, email_verified) VALUES (?, ?, ?, ?, 0)',
    [String(data.email), hash, data.name, data.role],
  );
  const userId = r.insertId;
  rateLimiter.hit(`register:${ip}`, REGISTER_WINDOW_MS);

  // Mint a 24h verification token and "send" the email (mailer abstraction:
  // console + /tmp/mailer.log by default, SMTP when MAIL_HOST is set).
  const rawToken = randomToken();
  await ctx.pool.query(
    "INSERT INTO email_verifications (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))",
    [userId, sha256hex(rawToken)],
  );
  const url = `${publicBaseUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;
  await sendVerificationEmail({ to: String(data.email), name: data.name, url });

  // No auto-login, no token: the SPA shows a "check your email" prompt.
  sendJson(ctx, 201, {
    user: { id: userId, email: String(data.email), name: data.name, role: data.role, emailVerified: false },
    message: 'Account created! Please verify your email address before signing in.',
  });
}