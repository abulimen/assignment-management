// Session + cookie primitives for the auth flows:
//   - opaque 32-byte refresh tokens, stored SHA-256-hashed (never raw);
//   - family_id groups all rotations of one login so a replayed token can
//     revoke the whole family;
//   - HttpOnly SameSite=Lax cookie with Path=/api scoping.

import crypto from 'node:crypto';
import { signJwt } from '@am/core';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 min
// Make the raw token's Max-Age match the DB expiry interval (30 days).
export const REFRESH_COOKIE = 'refresh_token';

// Non-HttpOnly session marker. NOT a security control — it only tells the SPA
// whether a refresh cookie *might* exist so the boot sequence can skip the
// /api/refresh probe (and its 401 console noise) for genuinely logged-out
// anonymous visits. The auth decision still lives in the HttpOnly cookie.
export const SESSION_MARKER_COOKIE = 'am_session';

function addCookie(res, cookie) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) return res.setHeader('Set-Cookie', cookie);
  if (Array.isArray(existing)) return res.setHeader('Set-Cookie', [...existing, cookie]);
  return res.setHeader('Set-Cookie', [existing, cookie]);
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function randomFamilyId() {
  return crypto.randomUUID();
}

// Access token: short-lived JWT issued in the response body.
export function issueAccessToken(user, secret) {
  return signJwt({ sub: user.id, role: user.role }, secret, ACCESS_TOKEN_TTL_SECONDS);
}

// Insert a fresh refresh token for a user/family; returns the raw token.
export async function issueRefreshToken(pool, userId, { familyId = randomFamilyId() } = {}) {
  const raw = randomToken();
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))`,
    [userId, familyId, sha256hex(raw)],
  );
  return { raw, familyId };
}

// Revoke every token in a family (logout / reuse detection / password reset).
export async function revokeRefreshFamily(pool, familyId) {
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ?', [familyId]);
}

// Revoke every refresh token a user owns (password reset).
export async function revokeAllUserRefreshTokens(pool, userId) {
  await pool.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ?', [userId]);
}

// --- cookie helpers ---------------------------------------------------------

function cookieIsSecure() {
  return process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production';
}

export function setRefreshCookie(res, raw) {
  const parts = [
    `${REFRESH_COOKIE}=${raw}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/api',
    'Max-Age=2592000',
  ];
  if (cookieIsSecure()) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
  // Session marker rides along on every login/refresh (readable by JS so the
  // SPA boot can skip the 401 refresh probe when there is no session at all).
  setSessionMarker(res);
}

export function setSessionMarker(res) {
  addCookie(res, `am_session=1; Path=/; SameSite=Lax; Max-Age=2592000`);
}

export function clearSessionMarker(res) {
  addCookie(res, `am_session=; Path=/; SameSite=Lax; Max-Age=0`);
}

export function clearRefreshCookie(res) {
  res.setHeader('Set-Cookie', `${REFRESH_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api; Max-Age=0`);
  clearSessionMarker(res);
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) {
      try {
        out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
      }
    }
  }
  return out;
}

export function getRefreshTokenFromRequest(req) {
  return parseCookies(req.headers.cookie || '')[REFRESH_COOKIE];
}

export function requestHasRefreshCookie(req) {
  return Boolean(getRefreshTokenFromRequest(req));
}

// Extract a best-effort client IP (supporting a reverse proxy).
export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}