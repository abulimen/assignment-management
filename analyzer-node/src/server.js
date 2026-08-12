// Stateless verdict service: POST /analyze {events, stats} → verdict.
// No DB access by design — the API server fetches evidence and calls us,
// which lets this service scale independently.
import http from 'node:http';
import { computeVerdict } from './engine.js';

const MAX_BODY = 50 * 1024 * 1024; // full event histories can be large

export function createAnalyzerServer({ port = Number(process.env.ANALYZER_PORT || 8002) } = {}) {
  const server = http.createServer((req, res) => {
    const send = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };

    if (req.method === 'GET' && req.url === '/health') {
      return send(200, { status: 'ok' });
    }

    if (req.method === 'POST' && req.url === '/analyze') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > MAX_BODY) {
          send(413, { error: 'payload too large' });
          req.destroy();
        }
      });
      req.on('end', () => {
        try {
          const { events, stats } = JSON.parse(body || '{}');
          if (!Array.isArray(events)) return send(400, { error: 'events array required' });
          return send(200, computeVerdict(events, stats || {}));
        } catch (err) {
          return send(400, { error: 'invalid JSON body' });
        }
      });
      return;
    }

    send(404, { error: 'not found' });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        port: server.address().port,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}
