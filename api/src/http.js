// Shared HTTP helpers for the API server: CORS, JSON responses, error
// envelope, body parsing, and the JWT guards. Mirrors src/guard.php and
// src/response.php behavior exactly (status codes + messages).
import { verifyJwt, decodeId } from '@am/core';

const MAX_BODY = 10 * 1024 * 1024; // 10 MB

export function setCors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
}

export function sendJson(ctx, status, data, headers = {}) {
  ctx.res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  ctx.res.end(JSON.stringify(data));
}

export function sendError(ctx, status, message) {
  sendJson(ctx, status, { error: message });
}

export function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    let aborted = false;
    req.on('data', (chunk) => {
      data += chunk;
      if (Buffer.byteLength(data) > MAX_BODY && !aborted) {
        aborted = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (aborted) return resolve({});
      if (!data) return resolve({});
      try {
        const parsed = JSON.parse(data);
        resolve(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export function guard(ctx) {
  const header = ctx.req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) {
    sendError(ctx, 401, 'Missing or malformed authorization header');
    return null;
  }
  const payload = verifyJwt(m[1], ctx.config.jwtSecret);
  if (!payload) {
    sendError(ctx, 401, 'Invalid or expired token');
    return null;
  }
  return payload; // { sub, role, iat, exp }
}

export function guardRole(ctx, role) {
  const payload = guard(ctx);
  if (!payload) return null;
  if (payload.role !== role) {
    sendError(ctx, 403, 'Forbidden');
    return null;
  }
  return payload;
}

// Parse a path param (supporting both obfuscated string IDs and raw numbers); returns null when missing/invalid (route 400).
export function parseIdParam(ctx, message = 'ID required') {
  const raw = ctx.params.id;
  const n = decodeId(raw);
  if (!n) {
    sendError(ctx, 400, message);
    return null;
  }
  return n;
}

// PHP require_fields: a field is missing when unset, or a string that trims
// to empty. Non-string present values (arrays, numbers) pass.
export function missingField(data, field) {
  const v = data[field];
  return v === undefined || (typeof v === 'string' && v.trim() === '');
}

// Convert ISO strings, timestamps, or date inputs into MySQL DATETIME 'YYYY-MM-DD HH:MM:SS'
export function parseDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}