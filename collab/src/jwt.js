// Manual HS256 JWT — mirrors src/jwt.php exactly (header alg is never trusted;
// HMAC-SHA256 with the shared JWT_SECRET, base64url, timing-safe compare).
// ponytail: no jsonwebtoken dep — the token format is 15 lines.
import { createHmac, timingSafeEqual } from 'node:crypto';

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function b64urlDecode(str) {
  return Buffer.from(str, 'base64url');
}

export function signJwt(payload, secret, expirySeconds = 604800) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ iat: now, exp: now + expirySeconds, ...payload }));
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyJwt(token, secret) {
  if (typeof token !== 'string' || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;

  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest();
  const given = b64urlDecode(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(body).toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.exp !== 'number') return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}
