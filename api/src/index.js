import http from 'node:http';
import fs from 'node:fs';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from '@am/core';
import { routes, matchRoute } from './routes/index.js';
import { setCors, sendJson, readBody } from './http.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

// Root-level files the SPA host also serves (PWA). Whitelisted basenames
// only; join(publicDir, basename) with the single-segment guard keeps the
// lookup path-safe. The service worker gets an explicit scope of "/" so it
// can intercept navigations across the whole app.
const SPA_ROOT_FILES = new Set([
  'sw.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
]);

// createApiServer({ port, config, staticDir }) → Promise<{ port, close() }>
// config: { db, jwtSecret, internalSecret, corsOrigin, analyzerUrl, collabUrl }
// staticDir: directory holding the built SPA (assets/ + assets/index.html).
// Defaults to the repo's public/ folder; the API server doubles as the SPA
// host, replacing the old Apache + index.php setup.

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "connect-src 'self' ws: wss:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

// Set on EVERY response (API/JSON/SPA/assets): the API server also hosts the
// SPA, so navigations and asset requests get the same protections.
function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', CSP);
  // HSTS: safe to omit on localhost http dev; enabled in production (or via
  // HSTS=true) when the site is served over HTTPS.
  if (process.env.NODE_ENV === 'production' || process.env.HSTS === 'true') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
}

export function createApiServer({ port, config, staticDir = null }) {
  const pool = createPool(config.db);
  const publicDir = staticDir
    ? nodePath.resolve(staticDir)
    : nodePath.resolve(nodePath.dirname(fileURLToPath(import.meta.url)), '../../public');

  const allowedOrigins = new Set([
    config.corsOrigin,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:8001',
    'http://127.0.0.1:8001',
  ]);

  const serveSpa = (res) => {
    const shell = nodePath.join(publicDir, 'assets', 'index.html');
    fs.readFile(shell, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('SPA not built (run: npm run build)');
      }
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(data);
    });
  };

  const server = http.createServer(async (req, res) => {
    let ctx;
    try {
      applySecurityHeaders(res);
      setCors(res, config.corsOrigin);
      const url = new URL(req.url, 'http://localhost');
      const urlPath = url.pathname.replace(/\/+$/, '') || '/';

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // CSRF: SameSite=Lax already blocks cross-site cookie sends, and as a
      // second layer every state-changing request that authenticates via the
      // refresh cookie must carry a matching Origin (same-origin SPA, the Vite
      // dev origin, or the actual HTTP(S) host the request targets). Bearer-
      // only requests carry no cookie → no CSRF risk → the check is skipped.
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const hasRefreshCookie = (req.headers.cookie || '').split(';').some(
          (c) => c.trim().startsWith('refresh_token='),
        );
        if (hasRefreshCookie) {
          const origin = req.headers.origin;
          const host = req.headers.host;
          const sameOrigin = host && (
            origin === `http://${host}` || origin === `https://${host}`
          );
          if (!origin || (!sameOrigin && !allowedOrigins.has(origin))) {
            return sendJson({ req, res, config, pool, params: {}, query: url.searchParams, body: {} }, 403, { error: 'Forbidden' });
          }
        }
      }

      const body = await readBody(req);
      ctx = { req, res, config, pool, params: {}, query: url.searchParams, body };

      let matched = null;
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const params = matchRoute(r.pattern, urlPath);
        if (params) { matched = { r, params }; break; }
      }
      if (!matched) {
        // Non-API paths are the SPA: serve /assets/* statically, serve the
        // whitelisted root-level PWA files from public/, and fall back to
        // the shell for client-side routes.
        if (!urlPath.startsWith('/api/') && req.method === 'GET') {
          if (urlPath.startsWith('/assets/')) {
            const file = nodePath.normalize(nodePath.join(publicDir, urlPath));
            if (file.startsWith(publicDir + nodePath.sep) && fs.existsSync(file) && fs.statSync(file).isFile()) {
              const type = MIME[nodePath.extname(file)] || 'application/octet-stream';
              return fs.readFile(file, (err, data) => {
                if (err) return serveSpa(res);
                res.writeHead(200, { 'Content-Type': type });
                res.end(data);
              });
            }
          }
          // Single-segment path → could be a root-level PWA file.
          const base = urlPath.replace(/^\//, ''); // strip leading '/'
          if (!base.includes('/') && SPA_ROOT_FILES.has(base)) {
            const file = nodePath.join(publicDir, base);
            if (fs.existsSync(file) && fs.statSync(file).isFile()) {
              const headers = { 'Content-Type': MIME[nodePath.extname(file)] || 'application/octet-stream' };
              if (base === 'sw.js') headers['Service-Worker-Allowed'] = '/';
              return fs.readFile(file, (err, data) => {
                if (err) return serveSpa(res);
                res.writeHead(200, headers);
                res.end(data);
              });
            }
          }
          return serveSpa(res);
        }
        return sendJson(ctx, 404, { error: 'Not found' });
      }

      ctx.params = matched.params;
      await matched.r.handler(ctx);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[api] unhandled error:', e);
      if (ctx && ctx.res && !ctx.res.headersSent) {
        sendJson(ctx, 500, { error: 'Internal server error' });
      } else if (res && !res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      } else if (res) {
        res.end();
      }
    }
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      const actual = server.address().port;
      resolve({
        port: actual,
        close: () =>
          new Promise((res) => {
            server.close(() => {
              pool.end().then(() => res()).catch(() => res());
            });
          }),
        pool,
      });
    });
  });
}