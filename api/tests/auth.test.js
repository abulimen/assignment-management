import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { verifyJwt } from '@am/core';
import {
  getHarness, apiCall, registerUser, firstCookiePair, cookieAttribute,
  TEST_JWT_SECRET,
} from './helpers/harness.js';
import { rateLimiter } from '../src/rateLimit.js';
import { lastMail, clearSentMails } from '../src/mailer.js';
import { sha256hex, randomToken } from '../src/sessions.js';

let h;

beforeAll(async () => { h = await getHarness(); });
afterAll(async () => { await h.close(); });
beforeEach(() => { rateLimiter.reset(); clearSentMails(); });

const uni = (p) => `${p}_${Date.now()}_${Math.floor(Math.random() * 1e6)}@test.local`;
const PASSWORD = 'password123';

describe('POST /api/register', () => {
  it('creates an unverified user, sends verification email, returns NO token', async () => {
    const email = uni('reg');
    const { status, json, cookies } = await apiCall(h.api, 'register', {
      method: 'POST',
      body: { email, password: PASSWORD, name: 'Alice', role: 'student' },
    });
    expect(status).toBe(201);
    expect(json.user.email).toBe(email);
    expect(json.user.name).toBe('Alice');
    expect(json.user.role).toBe('student');
    expect(json.user.emailVerified).toBe(false);
    expect(json.user.id).toBeTruthy();
    expect(json.message).toContain('verify');
    // No auto-login: no token in the body, no session cookie set.
    expect(json.token).toBeUndefined();
    expect(json.accessToken).toBeUndefined();
    expect(cookies.length).toBe(0);

    // bcrypt cost 12, stored hash verifiable with plain bcrypt.
    const [[row]] = await h.pool.query('SELECT password, email_verified FROM users WHERE email = ?', [email]);
    expect(row.password).toMatch(/^\$2[aby]\$12\$/);
    expect(row.password).not.toBe(PASSWORD);
    expect(bcrypt.compareSync(PASSWORD, row.password)).toBe(true);
    expect(row.email_verified).toBe(0);

    // Verification token row + mailer capture with the raw token & URL.
    const [[vrow]] = await h.pool.query(
      'SELECT token_hash, used_at FROM email_verifications WHERE user_id = ?',
      [json.user.id],
    );
    expect(vrow.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(vrow.used_at).toBeNull();
    const mail = lastMail();
    expect(mail.subject).toContain('Verify');
    expect(mail.body).toContain('http://localhost:3000/verify-email?token=');
    // token_hash in DB is the sha256 of the raw token in the email.
    expect(vrow.token_hash).toBe(sha256hex(mail.token));
  });

  it('rejects duplicate email with 409', async () => {
    const email = uni('dup');
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'A', role: 'student' } });
    const { status, json } = await apiCall(h.api, 'register', { method: 'POST', body: { email, password: 'otherpass1', name: 'B', role: 'student' } });
    expect(status).toBe(409);
    expect(json.error).toBe('Email already registered');
  });

  it('rejects missing fields with 422', async () => {
    const { status, json } = await apiCall(h.api, 'register', { method: 'POST', body: { email: 'x@test.local', password: PASSWORD } });
    expect(status).toBe(422);
    expect(json.error).toBe('Missing required field: name');
  });

  it('rejects invalid email with 422', async () => {
    const { status, json } = await apiCall(h.api, 'register', { method: 'POST', body: { email: 'not-an-email', password: PASSWORD, name: 'A', role: 'student' } });
    expect(status).toBe(422);
    expect(json.error).toBe('Invalid email address');
  });

  it('rejects invalid role with 422', async () => {
    const { status, json } = await apiCall(h.api, 'register', { method: 'POST', body: { email: uni('r'), password: PASSWORD, name: 'A', role: 'admin' } });
    expect(status).toBe(422);
    expect(json.error).toBe('Role must be lecturer or student');
  });

  it('rejects short password with 422', async () => {
    const { status, json } = await apiCall(h.api, 'register', { method: 'POST', body: { email: uni('s'), password: 'short', name: 'A', role: 'student' } });
    expect(status).toBe(422);
    expect(json.error).toBe('Password must be at least 8 characters');
  });

  it('rate-limits registrations per IP (10/hour)', async () => {
    // 10 hits fill the window; the 11th is refused while the counter is up.
    const before = rateLimiter._internal.buckets.size;
    for (let i = 0; i < 12; i++) {
      const { status } = await apiCall(h.api, 'register', {
        method: 'POST',
        body: { email: uni('rl'), password: PASSWORD, name: `R${i}`, role: 'student' },
      });
      if (i < 10) expect(status).toBe(201);
      else expect(status).toBe(429);
    }
    expect(rateLimiter._internal.buckets.size).toBe(before + 1); // one IP key
    rateLimiter.reset();
  });
});

describe('POST /api/login', () => {
  async function verifiedUser() {
    const email = uni('login');
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'Bob', role: 'lecturer' } });
    await h.pool.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email]);
    return email;
  }

  it('logs in with correct credentials: accessToken + user, sets HttpOnly cookie', async () => {
    const email = await verifiedUser();
    const { status, json, cookies } = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: PASSWORD } });
    expect(status).toBe(200);
    expect(json.user.email).toBe(email);
    expect(json.user.role).toBe('lecturer');
    expect(json.user.emailVerified).toBe(true);
    // New contract: `accessToken` field (no `token`), short TTL + expiresIn.
    expect(json.token).toBeUndefined();
    expect(json.accessToken).toBeTruthy();
    expect(json.expiresIn).toBe(15 * 60);
    const payload = verifyJwt(json.accessToken, TEST_JWT_SECRET);
    expect(payload).toBeTruthy();
    expect(payload.sub).toBe(json.user.id);
    expect(Number(payload.exp) - Number(payload.iat)).toBe(15 * 60);
    // Refresh cookie: HttpOnly, SameSite=Lax, Path=/api, Max-Age 30d.
    // Plus the non-HttpOnly am_session marker (boot fast-path, not a secret).
    expect(cookies.length).toBe(2);
    const ck = cookies[0];
    expect(ck).toMatch(/^refresh_token=/);
    expect(cookieAttribute(cookies, 'HttpOnly')).toBe(true);
    expect(cookieAttribute(cookies, 'SameSite')).toBe('Lax');
    expect(cookieAttribute(cookies, 'Path')).toBe('/api');
    expect(cookieAttribute(cookies, 'Max-Age')).toBe('2592000');
    const marker = cookies.find((c) => c.startsWith('am_session='));
    expect(marker).toBeTruthy();
    expect(marker).toContain('Path=/');
    expect(marker).not.toContain('HttpOnly');
  });

  it('refuses login for an unverified account with 403 EMAIL_UNVERIFIED', async () => {
    const email = uni('unver');
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'C', role: 'student' } });
    const { status, json } = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: PASSWORD } });
    expect(status).toBe(403);
    expect(json.code).toBe('EMAIL_UNVERIFIED');
    expect(json.error).toContain('verify your email address');
  });

  it('rejects wrong password with 401', async () => {
    const email = uni('wrong');
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'C', role: 'student' } });
    await h.pool.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email]);
    const { status, json } = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: 'wrongpass1' } });
    expect(status).toBe(401);
    expect(json.error).toBe('Invalid email or password');
  });

  it('rejects unknown email with 401 (no enumeration)', async () => {
    const { status, json } = await apiCall(h.api, 'login', { method: 'POST', body: { email: 'nobody@test.local', password: PASSWORD } });
    expect(status).toBe(401);
    expect(json.error).toBe('Invalid email or password');
  });

  it('locks the identity after 5 failures: 6th gets 429 + Retry-After even with the correct password', async () => {
    const email = uni('lock');
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'L', role: 'student' } });
    await h.pool.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email]);

    for (let i = 0; i < 5; i++) {
      const { status } = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: 'badpass99' } });
      expect(status).toBe(401);
    }
    // 6th attempt — CORRECT password — still refused while locked out.
    const sixth = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: PASSWORD } });
    expect(sixth.status).toBe(429);
    expect(sixth.headers.get('retry-after')).toBeTruthy();
    expect(sixth.json.code).toBe('RATE_LIMITED');
    // 7th also refused (lock persists).
    const seventh = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: PASSWORD } });
    expect(seventh.status).toBe(429);

    // Reset (exported test seam) unlocks the identity.
    rateLimiter.reset();
    const after = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: PASSWORD } });
    expect(after.status).toBe(200);
  });
});

describe('GET /api/me', () => {
  it('returns the profile for a valid Bearer token', async () => {
    const { token, user } = await registerUser(h.api, { name: 'Me Person', role: 'lecturer' });
    const { status, json } = await apiCall(h.api, 'me', { token });
    expect(status).toBe(200);
    expect(json.user.id).toBe(user.id);
    expect(json.user.email).toBe(user.email);
    expect(json.user.name).toBe('Me Person');
    expect(json.user.role).toBe('lecturer');
    expect(json.user.emailVerified).toBe(true);
  });

  it('rejects a missing token with 401', async () => {
    const { status } = await apiCall(h.api, 'me');
    expect(status).toBe(401);
  });
});

describe('POST /api/refresh', () => {
  async function loggedInCookie() {
    const { user } = await registerUser(h.api, { name: 'Rotate' });
    const res = await apiCall(h.api, 'login', { method: 'POST', body: { email: user.email, password: PASSWORD } });
    return { jar: firstCookiePair(res.cookies), user };
  }

  it('rotates the token: old cookie unusable afterwards, new one works', async () => {
    const { jar: cookieA, user } = await loggedInCookie();
    const r1 = await apiCall(h.api, 'refresh', { method: 'POST', cookies: cookieA });
    expect(r1.status).toBe(200);
    expect(r1.json.accessToken).toBeTruthy();
    expect(r1.json.expiresIn).toBe(15 * 60);
    const payload = verifyJwt(r1.json.accessToken, TEST_JWT_SECRET);
    expect(payload.sub).toBe(user.id);
    const cookieB = firstCookiePair(r1.cookies);
    expect(cookieB).not.toBe(cookieA);

    // New token rotates again and works.
    const r2 = await apiCall(h.api, 'refresh', { method: 'POST', cookies: cookieB });
    expect(r2.status).toBe(200);
    const cookieC = firstCookiePair(r2.cookies);
    expect(cookieC).not.toBe(cookieB);

    // Old cookie (already used) is treated as reuse → family revoked.
    const r3 = await apiCall(h.api, 'refresh', { method: 'POST', cookies: cookieB });
    expect(r3.status).toBe(401);
    expect(r3.json.code).toBe('SESSION_REVOKED');

    // The freshly-rotated C is now revoked too (whole family).
    const r4 = await apiCall(h.api, 'refresh', { method: 'POST', cookies: cookieC });
    expect(r4.status).toBe(401);
  });

  it('reuse detection revokes the whole family', async () => {
    const { jar: cookieA } = await loggedInCookie();
    const r1 = await apiCall(h.api, 'refresh', { method: 'POST', cookies: cookieA });
    expect(r1.status).toBe(200);
    const cookieB = firstCookiePair(r1.cookies);

    // Replay the STALE rotated token → family revoked.
    const r2 = await apiCall(h.api, 'refresh', { method: 'POST', cookies: cookieA });
    expect(r2.status).toBe(401);
    expect(r2.json.code).toBe('SESSION_REVOKED');

    // The rotated token that SHOULD have worked is now dead too.
    const r3 = await apiCall(h.api, 'refresh', { method: 'POST', cookies: cookieB });
    expect(r3.status).toBe(401);
  });

  it('rejects a refresh without a cookie', async () => {
    const { status, json } = await apiCall(h.api, 'refresh', { method: 'POST' });
    expect(status).toBe(401);
    expect(json.code).toBe('SESSION_INVALID');
  });

  it('stores only the sha256 hash (never the raw token)', async () => {
    const { jar } = await loggedInCookie();
    const [[row]] = await h.pool.query('SELECT token_hash FROM refresh_tokens');
    // The raw cookie value should never appear in the DB.
    const all = JSON.stringify(await (await h.pool.query('SELECT token_hash FROM refresh_tokens'))[0]);
    expect(all).not.toContain(jar.split('=')[1]);
    expect(row.token_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('POST /api/logout', () => {
  it('revokes the refresh family; refresh afterwards is 401', async () => {
    const { user } = await registerUser(h.api, { name: 'Out' });
    const login = await apiCall(h.api, 'login', { method: 'POST', body: { email: user.email, password: PASSWORD } });
    const jar = firstCookiePair(login.cookies);

    const out = await apiCall(h.api, 'logout', { method: 'POST', cookies: jar });
    expect(out.status).toBe(204);
    // Clearing Set-Cookie with Max-Age=0.
    expect(cookieAttribute(out.cookies, 'Max-Age')).toBe('0');

    const after = await apiCall(h.api, 'refresh', { method: 'POST', cookies: jar });
    expect(after.status).toBe(401);
  });

  it('is idempotent without a cookie', async () => {
    const out = await apiCall(h.api, 'logout', { method: 'POST' });
    expect(out.status).toBe(204);
  });
});

describe('email verification flow', () => {
  function rawTokenFromMail() {
    const m = lastMail();
    const t = /token=([A-Za-z0-9_-]+)/.exec(m.body);
    return t ? t[1] : null;
  }

  it('verifies via the emailed link (DB hash matches), then login works', async () => {
    const email = uni('ver1');
    const reg = await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'V', role: 'student' } });
    const raw = rawTokenFromMail();

    // DB stores the SHA-256 hash of the raw token.
    const [[vrow]] = await h.pool.query('SELECT token_hash FROM email_verifications WHERE user_id = ?', [reg.json.user.id]);
    expect(vrow.token_hash).toBe(sha256hex(raw));

    const pre = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: PASSWORD } });
    expect(pre.status).toBe(403);

    const verify = await apiCall(h.api, `verify-email?token=${encodeURIComponent(raw)}`, { method: 'GET' });
    expect(verify.status).toBe(200);
    expect(verify.json.emailVerified).toBe(true);

    const [[urow]] = await h.pool.query('SELECT email_verified FROM users WHERE id = ?', [reg.json.user.id]);
    expect(urow.email_verified).toBe(1);

    const login = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: PASSWORD } });
    expect(login.status).toBe(200);
  });

  it('rejects a bad token and refuses reuse of a spent token', async () => {
    const email = uni('ver2');
    const reg = await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'V2', role: 'student' } });

    const bogus = await apiCall(h.api, `verify-email?token=${randomToken()}`, { method: 'GET' });
    expect(bogus.status).toBe(400);

    const raw = rawTokenFromMail();
    expect(await apiCall(h.api, `verify-email?token=${encodeURIComponent(raw)}`, { method: 'GET' })).toMatchObject({ status: 200 });
    // Second use of the same token fails.
    const again = await apiCall(h.api, `verify-email?token=${encodeURIComponent(raw)}`, { method: 'GET' });
    expect(again.status).toBe(400);
    void reg;
  });

  it('rejects an expired verification token', async () => {
    const email = uni('ver3');
    const reg = await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'V3', role: 'student' } });
    await h.pool.query('UPDATE email_verifications SET expires_at = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE user_id = ?', [reg.json.user.id]);
    const raw = rawTokenFromMail();
    const res = await apiCall(h.api, `verify-email?token=${encodeURIComponent(raw)}`, { method: 'GET' });
    expect(res.status).toBe(400);
  });

  it('resends a fresh link (generous message, no enumeration), and it works', async () => {
    const email = uni('resend1');
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'R', role: 'student' } });
    clearSentMails();

    const res = await apiCall(h.api, 'resend-verification', { method: 'POST', body: { email } });
    expect(res.status).toBe(200);
    expect(res.json.message).toContain('If that email address is registered');
    const freshRaw = rawTokenFromMail();
    expect(freshRaw).toBeTruthy();

    const verify = await apiCall(h.api, `verify-email?token=${encodeURIComponent(freshRaw)}`, { method: 'GET' });
    expect(verify.status).toBe(200);
  });

  it('resend for unknown email still answers 200 (no enumeration), and sends no mail', async () => {
    clearSentMails();
    const res = await apiCall(h.api, 'resend-verification', { method: 'POST', body: { email: 'ghost@test.local' } });
    expect(res.status).toBe(200);
    expect(res.json.message).toContain('If that email address is registered');
    expect(lastMail()).toBeUndefined();
  });
});

describe('password reset flow', () => {
  function resetTokenFromMail() {
    const m = lastMail();
    const t = /token=([A-Za-z0-9_-]+)/.exec(m.body);
    return t ? t[1] : null;
  }

  it('forgot → reset works; login with new password, old password fails', async () => {
    const email = uni('pw1');
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'P', role: 'student' } });
    await h.pool.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email]);

    const forgot = await apiCall(h.api, 'forgot-password', { method: 'POST', body: { email } });
    expect(forgot.status).toBe(200);
    expect(forgot.json.message).toContain('If that email address is registered');

    const raw = resetTokenFromMail();
    expect(raw).toBeTruthy();

    const reset = await apiCall(h.api, 'reset-password', { method: 'POST', body: { token: raw, password: 'newpassword1' } });
    expect(reset.status).toBe(200);

    // Old refresh sessions invalidated; old password dead; new password works.
    const oldLogin = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: PASSWORD } });
    expect(oldLogin.status).toBe(401);
    const newLogin = await apiCall(h.api, 'login', { method: 'POST', body: { email, password: 'newpassword1' } });
    expect(newLogin.status).toBe(200);

    // Replay of the reset token fails.
    const replay = await apiCall(h.api, 'reset-password', { method: 'POST', body: { token: raw, password: 'anotherpass1' } });
    expect(replay.status).toBe(400);
  });

  it('rejects wrong/expired reset tokens', async () => {
    const email = uni('pw2');
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'P2', role: 'student' } });
    await h.pool.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email]);

    const wrong = await apiCall(h.api, 'reset-password', { method: 'POST', body: { token: randomToken(), password: 'newpassword1' } });
    expect(wrong.status).toBe(400);

    await apiCall(h.api, 'forgot-password', { method: 'POST', body: { email } });
    const raw = resetTokenFromMail();
    await h.pool.query('UPDATE password_resets SET expires_at = DATE_SUB(NOW(), INTERVAL 2 HOUR)');
    const expired = await apiCall(h.api, 'reset-password', { method: 'POST', body: { token: raw, password: 'newpassword1' } });
    expect(expired.status).toBe(400);
  });

  it('rejects a weak new password', async () => {
    const email = uni('pw3');
    await apiCall(h.api, 'register', { method: 'POST', body: { email, password: PASSWORD, name: 'P3', role: 'student' } });
    await h.pool.query('UPDATE users SET email_verified = 1 WHERE email = ?', [email]);
    await apiCall(h.api, 'forgot-password', { method: 'POST', body: { email } });
    const raw = resetTokenFromMail();
    const weak = await apiCall(h.api, 'reset-password', { method: 'POST', body: { token: raw, password: 'short' } });
    expect(weak.status).toBe(422);
  });

  it('forgot-password for an unknown email is still 200', async () => {
    const res = await apiCall(h.api, 'forgot-password', { method: 'POST', body: { email: 'missing@test.local' } });
    expect(res.status).toBe(200);
  });

  it('reset revokes all refresh tokens for the user', async () => {
    const { user } = await registerUser(h.api, { name: 'P4' });
    const login = await apiCall(h.api, 'login', { method: 'POST', body: { email: user.email, password: PASSWORD } });
    const jar = firstCookiePair(login.cookies);

    await apiCall(h.api, 'forgot-password', { method: 'POST', body: { email: user.email } });
    const raw = resetTokenFromMail();
    await apiCall(h.api, 'reset-password', { method: 'POST', body: { token: raw, password: 'brandNewPass1' } });

    const refresh = await apiCall(h.api, 'refresh', { method: 'POST', cookies: jar });
    expect(refresh.status).toBe(401);
  });
});