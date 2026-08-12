// Internal HTTP API — PHP talks to the collab server over loopback with a
// shared secret. Endpoints:
//   GET  /health                     — liveness
//   GET  /internal/doc/:groupId/state — canonical content hash (mark-Done)
// Task 4 adds POST /internal/doc/:groupId/seal.
import http from 'node:http';
import { docNameFor, parseDocName } from './server.js';
import { docContentSha256 } from './export.js';

export async function createInternalApi({ port = 8004, pool, hocuspocus, internalSecret }) {
  // Open the document whether or not it is currently loaded in memory.
  async function withDocument(groupId, fn) {
    const documentName = docNameFor(groupId);
    const loaded = hocuspocus.documents.get(documentName);
    if (loaded) return fn(loaded);
    const direct = await hocuspocus.openDirectConnection(documentName);
    try {
      return await fn(direct.document);
    } finally {
      await direct.disconnect();
    }
  }

  const readBody = (req) => new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data ? JSON.parse(data) : {}));
  });

  const server = http.createServer(async (req, res) => {
    const send = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };

    if (req.headers['x-internal-secret'] !== internalSecret) {
      return send(401, { error: 'unauthorized' });
    }

    try {
      if (req.method === 'GET' && req.url === '/health') {
        return send(200, { ok: true });
      }

      const stateMatch = /^\/internal\/doc\/(\d+)\/state$/.exec(req.url || '');
      if (req.method === 'GET' && stateMatch) {
        const groupId = Number(stateMatch[1]);
        const sha256 = await withDocument(groupId, (doc) => docContentSha256(doc));
        return send(200, { groupId, sha256 });
      }

      send(404, { error: 'not found' });
    } catch (err) {
      send(500, { error: err.message });
    }
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  return {
    port: server.address().port,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
