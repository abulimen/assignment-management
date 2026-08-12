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
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

// createApiServer({ port, config, staticDir }) → Promise<{ port, close() }>
// config: { db, jwtSecret, internalSecret, corsOrigin, analyzerUrl, collabUrl }
// staticDir: directory holding the built SPA (assets/ + assets/index.html).
// Defaults to the repo's public/ folder; the API server doubles as the SPA
// host, replacing the old Apache + index.php setup.
export function createApiServer({ port, config, staticDir = null }) {
  const pool = createPool(config.db);
  const publicDir = staticDir
    ? nodePath.resolve(staticDir)
    : nodePath.resolve(nodePath.dirname(fileURLToPath(import.meta.url)), '../../public');

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
      setCors(res, config.corsOrigin);
      const url = new URL(req.url, 'http://localhost');
      const urlPath = url.pathname.replace(/\/+$/, '') || '/';

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
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
        // Non-API paths are the SPA: serve /assets/* statically, fall back
        // to the shell for client-side routes.
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