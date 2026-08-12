import http from 'node:http';
import { createPool } from '@am/core';
import { routes, matchRoute } from './routes/index.js';
import { setCors, sendJson, readBody } from './http.js';

// createApiServer({ port, config }) → Promise<{ port, close() }>
// config: { db, jwtSecret, internalSecret, corsOrigin, analyzerUrl, collabUrl }
export function createApiServer({ port, config }) {
  const pool = createPool(config.db);

  const server = http.createServer(async (req, res) => {
    let ctx;
    try {
      setCors(res, config.corsOrigin);
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname.replace(/\/+$/, '') || '/';

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
        const params = matchRoute(r.pattern, path);
        if (params) { matched = { r, params }; break; }
      }
      if (!matched) return sendJson(ctx, 404, { error: 'Not found' });

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