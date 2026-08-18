// Shared server core for all Node services (api, collab, analyzer).
// One JWT implementation keeps tokens byte-compatible across every service;
// the HS256 format mirrors the legacy PHP jwt.php exactly (parity-tested in
// collab/tests/jwt.test.js against PHP-generated tokens).
import { createHmac, timingSafeEqual } from 'node:crypto';
import mysql from 'mysql2/promise';

// Env-config with the defaults every service agrees on.
export function loadConfig() {
  return {
    db: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'assignment_mgmt',
    },
    jwtSecret: process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION',
    internalSecret: process.env.INTERNAL_API_SECRET || 'local-dev-internal-secret',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  };
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
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
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') return null;
  if (typeof payload.exp !== 'number') return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export function createPool(db) {  return mysql.createPool({
    host: db.host,
    port: Number(db.port),
    user: db.user,
    password: db.password,
    database: db.database,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
  });
}

export * from "./text.js";
export * from "./stats.js";
export * from "./hashids.js";
