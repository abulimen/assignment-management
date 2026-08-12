// Realtime event intake over WebSocket — for solo AND group work.
// Clients stream tracker events here instead of (or before) HTTP batching;
// the server stamps received_at with ITS clock, so client-reported times can
// be cross-checked by the analyzer. Ownership is enforced per message.
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { verifyJwt } from './jwt.js';

export async function createTrackingServer({
  port = Number(process.env.COLLAB_TRACKING_PORT || 8005),
  pool,
  jwtSecret,
} = {}) {
  const httpServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'tracking' }));
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (socket, req) => {
    const url = new URL(req.url || '/', 'http://localhost');
    const payload = verifyJwt(url.searchParams.get('token') || '', jwtSecret);
    if (!payload || !Number.isInteger(payload.sub)) {
      socket.close(4401, 'unauthorized');
      return;
    }
    if (payload.role !== 'student') {
      socket.close(4403, 'students only');
      return;
    }
    const userId = payload.sub;

    socket.on('message', async (raw) => {
      const send = (obj) => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(obj));
      };

      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return send({ type: 'error', message: 'invalid JSON' });
      }
      if (msg?.type !== 'events') return send({ type: 'error', message: 'unknown message type' });

      const submissionId = Number(msg.submission_id);
      if (!Number.isInteger(submissionId) || !Array.isArray(msg.events) || msg.events.length === 0) {
        return send({ type: 'error', message: 'submission_id and non-empty events required' });
      }

      try {
        const [[sub]] = await pool.query(
          'SELECT student_id, status FROM submissions WHERE id = ?',
          [submissionId],
        );
        if (!sub) return send({ type: 'error', message: 'submission not found' });
        if (Number(sub.student_id) !== userId) return send({ type: 'error', message: 'not your submission' });
        if (sub.status === 'submitted') return send({ type: 'error', message: 'submission already submitted' });

        const receivedAt = new Date(); // server truth for the whole batch
        const rows = msg.events.map((e) => [
          submissionId,
          typeof e?.type === 'string' ? e.type : 'step',
          JSON.stringify(e?.data ?? {}),
          e?.steps_json ?? null,
          e?.selection_from ?? null,
          e?.selection_to ?? null,
          Number.isFinite(Number(e?.occurred_at)) ? Number(e.occurred_at) : Date.now() / 1000,
          Number.isInteger(e?.sequence) ? e.sequence : 0,
          receivedAt,
        ]);
        await pool.query(
          'INSERT INTO events (submission_id, type, data, steps_json, selection_from, selection_to, occurred_at, sequence, received_at) VALUES ?',
          [rows],
        );
        send({ type: 'ack', count: rows.length });
      } catch {
        send({ type: 'error', message: 'intake failed' });
      }
    });
  });

  await new Promise((resolve) => httpServer.listen(port, '127.0.0.1', resolve));

  return {
    port: httpServer.address().port,
    close: () => new Promise((resolve) => wss.close(() => httpServer.close(resolve))),
  };
}
