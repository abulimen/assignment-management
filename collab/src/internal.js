// Internal HTTP API — PHP talks to the collab server over loopback with a
// shared secret. Task 1 ships only auth + health; /doc/:id/state and
// /doc/:id/seal arrive in task 4.
import http from 'node:http';

export async function createInternalApi({ port = 8004, pool, hocuspocus, internalSecret }) {
  const server = http.createServer(async (req, res) => {
    const send = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };

    if (req.headers['x-internal-secret'] !== internalSecret) {
      return send(401, { error: 'unauthorized' });
    }

    if (req.method === 'GET' && req.url === '/health') {
      return send(200, { ok: true });
    }

    send(404, { error: 'not found' });
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  return {
    port: server.address().port,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
