import http from 'node:http';
import fs from 'node:fs';
import zlib from 'node:zlib';
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
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

// Root-level files the SPA host also serves (PWA + SEO). Whitelisted basenames
// only; join(publicDir, basename) with the single-segment guard keeps the
// lookup path-safe. The service worker gets an explicit scope of "/" so it
// can intercept navigations across the whole app.
const SPA_ROOT_FILES = new Set([
  'sw.js',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'robots.txt',
]);

// Cache-Control policy (headed for the Lighthouse performance/best-practices
// gates): versioned build assets are immutable, fonts are long-lived static
// files, and the HTML shell + service worker must NEVER be cached by the
// browser (the SW has no HTTP cache to expire and needs fresh updates).
const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable'; // /assets/* hashed files
const CACHE_FONTS = 'public, max-age=2592000'; // /fonts/* static (30d)
const CACHE_NO_CACHE = 'no-cache'; // index.html shell, sw.js, robots.txt

// Compression: gzip once per (path,mtime) and memoize the compressed Buffer so
// repeated hits skip zlib entirely. woff2/png/jpg/ico are already compressed.
const COMPRESSIBLE_EXT = new Set(['.html', '.js', '.css', '.json', '.svg', '.webmanifest', '.txt']);
const gzCache = new Map(); // `${path}:${mtimeMs}` → gzipped Buffer

function acceptsGzip(req) {
  return /(^|,)\s*gzip(\s*,|$)/.test(req.headers['accept-encoding'] || '');
}

function gzipStatic(filePath, mtimeMs) {
  const key = `${filePath}:${mtimeMs}`;
  const hit = gzCache.get(key);
  if (hit) return hit;
  let gz = null;
  try {
    gz = zlib.gzipSync(fs.readFileSync(filePath), { level: 6 });
  } catch {
    gz = null;
  }
  if (gz) gzCache.set(key, gz);
  return gz;
}

// createApiServer({ port, config, staticDir }) → Promise<{ port, close() }>
// config: { db, jwtSecret, internalSecret, corsOrigin, analyzerUrl, collabUrl }
// staticDir: directory holding the built SPA (assets/ + assets/index.html).
// Defaults to the repo's public/ folder; the API server doubles as the SPA
// host, replacing the old Apache + index.php setup.

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
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

  // Serve a static file from the SPA host with cache + gzip handling.
  // When the file is missing it invokes onMissing (default: 404).
  const serveStaticFile = (req, res, file, { cacheControl, extraHeaders = {}, onMissing } = {}) => {
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      if (onMissing) return onMissing();
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    if (!stat.isFile()) {
      if (onMissing) return onMissing();
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }

    const ext = nodePath.extname(file);
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      ...extraHeaders,
    };
    if (cacheControl) headers['Cache-Control'] = cacheControl;

    const gz = acceptsGzip(req) && COMPRESSIBLE_EXT.has(ext)
      ? gzipStatic(file, stat.mtimeMs)
      : null;
    if (gz) {
      headers['Content-Encoding'] = 'gzip';
      headers['Vary'] = 'Accept-Encoding';
      res.writeHead(200, headers);
      return res.end(gz);
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        if (onMissing) return onMissing();
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('Not found');
      }
      res.writeHead(200, headers);
      res.end(data);
    });
    return undefined;
  };

  const serveSpa = (req, res) => {
    const shell = nodePath.join(publicDir, 'assets', 'index.html');
    return serveStaticFile(req, res, shell, {
      cacheControl: CACHE_NO_CACHE,
      onMissing: () => {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('SPA not built (run: npm run build)');
        return undefined;
      },
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
          // Shared static-directory guard: normalized join must stay inside
          // publicDir, and the target must be a real file.
          const safeFile = (urlPath) => {
            const file = nodePath.normalize(nodePath.join(publicDir, urlPath));
            if (!file.startsWith(publicDir + nodePath.sep)) return null;
            return file;
          };
          if (urlPath.startsWith('/assets/')) {
            const file = safeFile(urlPath);
            if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
              return serveStaticFile(req, res, file, { cacheControl: CACHE_IMMUTABLE });
            }
            return serveSpa(req, res);
          }
          if (urlPath.startsWith('/fonts/')) {
            const file = safeFile(urlPath);
            if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
              return serveStaticFile(req, res, file, { cacheControl: CACHE_FONTS });
            }
            return serveSpa(req, res);
          }
          // Single-segment path → could be a root-level PWA/SEO file.
          const base = urlPath.replace(/^\//, ''); // strip leading '/'
          if (!base.includes('/') && SPA_ROOT_FILES.has(base)) {
            const file = nodePath.join(publicDir, base);
            if (fs.existsSync(file) && fs.statSync(file).isFile()) {
              const extraHeaders = {};
              if (base === 'sw.js') extraHeaders['Service-Worker-Allowed'] = '/';
              const cacheControl = base === 'sw.js' || base === 'manifest.webmanifest' || base === 'robots.txt'
                ? CACHE_NO_CACHE
                : CACHE_FONTS;
              return serveStaticFile(req, res, file, { cacheControl, extraHeaders });
            }
          }
          return serveSpa(req, res);
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