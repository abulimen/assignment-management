// Realtime event intake over WebSocket: server-authoritative timestamps,
// JWT auth, ownership checks — for solo and group work alike.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signJwt } from '../src/jwt.js';
import { createTrackingServer } from '../src/tracking.js';
import { getPool, seedGroup, waitFor, TEST_JWT_SECRET } from './helpers/testenv.js';

let pool;
let server;

beforeAll(async () => {
  pool = await getPool();
  server = await createTrackingServer({ port: 0, pool, jwtSecret: TEST_JWT_SECRET });
});

afterAll(async () => {
  await server.close();
  await pool.end();
});

function wsConnect(token) {
  const url = `ws://127.0.0.1:${server.port}/?token=${encodeURIComponent(token)}`;
  const socket = new WebSocket(url);
  const messages = [];
  socket.addEventListener('message', (e) => messages.push(JSON.parse(e.data)));
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, v) => {
      if (!settled) { settled = true; fn(v); }
    };
    // First server message = working session. Auth rejections arrive as a
    // close right after the handshake, so give the server a grace window
    // before declaring the connection accepted.
    socket.addEventListener('open', () => {
      setTimeout(() => done(resolve, { socket, messages }), 250);
    });
    socket.addEventListener('close', (e) => {
      done(reject, new Error(`closed:${e.code}`));
    });
    socket.addEventListener('error', () => {}); // a close always follows
  });
}

function send(socket, obj) {
  socket.send(JSON.stringify(obj));
}

async function seedSubmission(seeded, { status = 'draft', studentId = null } = {}) {
  const [r] = await pool.query(
    'INSERT INTO submissions (assignment_id, student_id, content, status) VALUES (?, ?, NULL, ?)',
    [seeded.assignmentId, studentId ?? seeded.memberIds[0], status],
  );
  return r.insertId;
}

const stepEvent = (seq, t) => ({
  type: 'step',
  data: {},
  steps_json: JSON.stringify([{ stepType: 'replace', from: seq, to: seq, slice: { content: [{ type: 'text', text: 'x' }] } }]),
  selection_from: seq,
  selection_to: seq + 1,
  occurred_at: t,
  sequence: seq,
});

describe('tracking WS intake', () => {
  it('rejects an invalid token', async () => {
    await expect(wsConnect('not-a-real-token')).rejects.toThrow(/closed:4401/);
  });

  it('rejects a lecturer (students only)', async () => {
    const seeded = await seedGroup(pool);
    const token = signJwt({ sub: seeded.lecturerId, role: 'lecturer' }, TEST_JWT_SECRET);
    await expect(wsConnect(token)).rejects.toThrow(/closed:4403/);
  });

  it('persists events for the owner with server-stamped received_at', async () => {
    const seeded = await seedGroup(pool);
    const submissionId = await seedSubmission(seeded);
    const token = signJwt({ sub: seeded.memberIds[0], role: 'student' }, TEST_JWT_SECRET);
    const { socket, messages } = await wsConnect(token);

    const liedTs = Date.now() / 1000 - 3600; // client claims an hour ago
    send(socket, {
      type: 'events',
      submission_id: submissionId,
      events: [stepEvent(1, liedTs), stepEvent(2, liedTs + 0.2)],
    });
    await waitFor(() => messages.find((m) => m.type === 'ack'));

    const [rows] = await pool.query(
      'SELECT occurred_at, received_at, sequence FROM events WHERE submission_id = ? ORDER BY sequence',
      [submissionId],
    );
    expect(rows).toHaveLength(2);
    // Client timestamp preserved (cadence needs it)…
    expect(Math.abs(parseFloat(rows[0].occurred_at) - liedTs)).toBeLessThan(0.01);
    // …but received_at is server truth, near now, not the lied time.
    const receivedMs = new Date(rows[0].received_at).getTime();
    expect(Math.abs(receivedMs - Date.now())).toBeLessThan(5000);
    expect(Math.abs(receivedMs / 1000 - liedTs)).toBeGreaterThan(3000);
    socket.close();
  });

  it('recomputes submission_stats after intake (regression: WS left stats at 0)', async () => {
    // Before the fix, the WS intake inserted events but never recomputed
    // submission_stats, so the StatsBar read stale zeros while the verdict
    // (which reads raw events) saw the real numbers.
    const seeded = await seedGroup(pool);
    const submissionId = await seedSubmission(seeded);
    const token = signJwt({ sub: seeded.memberIds[0], role: 'student' }, TEST_JWT_SECRET);
    const { socket, messages } = await wsConnect(token);

    const t0 = Date.now() / 1000;
    const events = [1, 2, 3, 4, 5].map((i) => stepEvent(i, t0 + i * 0.15));
    send(socket, { type: 'events', submission_id: submissionId, events });
    await waitFor(() => messages.find((m) => m.type === 'ack'));

    await waitFor(async () => {
      const [rows] = await pool.query(
        'SELECT keystroke_count, total_time_ms FROM submission_stats WHERE submission_id = ?',
        [submissionId],
      );
      return rows.length && Number(rows[0].keystroke_count) === 5 ? rows[0] : null;
    });
    const [rows] = await pool.query('SELECT keystroke_count FROM submission_stats WHERE submission_id = ?', [submissionId]);
    expect(Number(rows[0].keystroke_count)).toBe(5);
    socket.close();
  });

  it('refuses events for another student\'s submission', async () => {
    const seeded = await seedGroup(pool);
    const submissionId = await seedSubmission(seeded, { studentId: seeded.memberIds[1] });
    const token = signJwt({ sub: seeded.memberIds[0], role: 'student' }, TEST_JWT_SECRET);
    const { socket, messages } = await wsConnect(token);
    send(socket, { type: 'events', submission_id: submissionId, events: [stepEvent(1, Date.now() / 1000)] });
    await waitFor(() => messages.find((m) => m.type === 'error'));
    const [rows] = await pool.query('SELECT COUNT(*) AS n FROM events WHERE submission_id = ?', [submissionId]);
    expect(rows[0].n).toBe(0);
    socket.close();
  });

  it('refuses events after submission', async () => {
    const seeded = await seedGroup(pool);
    const submissionId = await seedSubmission(seeded, { status: 'submitted' });
    const token = signJwt({ sub: seeded.memberIds[0], role: 'student' }, TEST_JWT_SECRET);
    const { socket, messages } = await wsConnect(token);
    send(socket, { type: 'events', submission_id: submissionId, events: [stepEvent(1, Date.now() / 1000)] });
    await waitFor(() => messages.find((m) => m.type === 'error'));
    expect(messages.find((m) => m.type === 'error').message).toMatch(/submitted/i);
    socket.close();
  });

  it('rejects malformed batches without dropping the connection', async () => {
    const seeded = await seedGroup(pool);
    const submissionId = await seedSubmission(seeded);
    const token = signJwt({ sub: seeded.memberIds[0], role: 'student' }, TEST_JWT_SECRET);
    const { socket, messages } = await wsConnect(token);
    send(socket, { type: 'events', submission_id: submissionId }); // no events array
    await waitFor(() => messages.find((m) => m.type === 'error'));
    expect(socket.readyState).toBe(WebSocket.OPEN);
    // Connection still usable afterwards.
    send(socket, { type: 'events', submission_id: submissionId, events: [stepEvent(9, Date.now() / 1000)] });
    await waitFor(() => messages.find((m) => m.type === 'ack'));
    socket.close();
  });
});
