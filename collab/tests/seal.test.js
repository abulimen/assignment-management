// Submission is a sealing event: the server snapshots the canonical doc,
// freezes the group durably, and rejects later writes — across restarts.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { signJwt } from '../src/jwt.js';
import {
  getPool, seedGroup, startTestServer, waitFor, TEST_JWT_SECRET, TEST_INTERNAL_SECRET,
} from './helpers/testenv.js';

let pool;
let server;

beforeAll(async () => {
  pool = await getPool();
  server = await startTestServer();
});

afterAll(async () => {
  await server?.destroy();
  await pool?.end();
});

async function seal(groupId, submissionId, secret = TEST_INTERNAL_SECRET) {
  const res = await fetch(`http://127.0.0.1:${server.internalPort}/internal/doc/${groupId}/seal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': secret },
    body: JSON.stringify({ submission_id: submissionId }),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function typeAndSync(groupId, userId, text) {
  const document = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${server.wsPort}`,
    name: `group:${groupId}`,
    document,
    token: signJwt({ sub: userId, role: 'student' }, TEST_JWT_SECRET),
  });
  await waitFor(async () => provider.synced);
  const frag = document.getXmlFragment('default');
  frag.insert(frag.length, [new Y.XmlText(text)]);
  await new Promise((r) => setTimeout(r, 300));
  provider.destroy();
  await new Promise((r) => setTimeout(r, 200));
}

async function seedSubmissionRow(seeded) {
  const [r] = await pool.query(
    'INSERT INTO submissions (assignment_id, student_id, content, status, group_id) VALUES (?, ?, NULL, ?, ?)',
    [seeded.assignmentId, seeded.leaderId, 'draft', seeded.groupId],
  );
  return r.insertId;
}

describe('POST /internal/doc/:groupId/seal', () => {
  it('rejects a wrong internal secret', async () => {
    const seeded = await seedGroup(pool);
    const res = await seal(seeded.groupId, 1, 'nope');
    expect(res.status).toBe(401);
  });

  it('rejects sealing with missing submission_id with 400', async () => {
    const seeded = await seedGroup(pool);
    const res = await seal(seeded.groupId, null);
    expect(res.status).toBe(400);
  });

  it('returns 404 when sealing a non-existent group', async () => {
    const res = await seal(999999, 1);
    expect(res.status).toBe(404);
  });

  it('snapshots the doc, freezes the group, and returns the rollup', async () => {
    const seeded = await seedGroup(pool);
    const [m0, m1] = seeded.memberIds;
    await typeAndSync(seeded.groupId, m0, 'written by m0 ');
    const submissionId = await seedSubmissionRow(seeded);

    const res = await seal(seeded.groupId, submissionId);
    expect(res.status).toBe(200);
    expect(res.json.sealed).toBe(true);
    expect(res.json.sha256).toMatch(/^[0-9a-f]{64}$/);

    const [[snap]] = await pool.query('SELECT * FROM group_doc_snapshots WHERE group_id = ?', [seeded.groupId]);
    expect(snap).toBeTruthy();
    expect(snap.submission_id).toBe(submissionId);
    expect(snap.content_sha256).toBe(res.json.sha256);
    expect(JSON.parse(snap.prosemirror_json).type).toBe('doc');
    expect(snap.html).toContain('written by m0');

    const [[group]] = await pool.query('SELECT frozen_at FROM `groups` WHERE id = ?', [seeded.groupId]);
    expect(group.frozen_at).toBeInstanceOf(Date);
  });

  it('is idempotent: sealing twice returns the same snapshot', async () => {
    const seeded = await seedGroup(pool);
    await typeAndSync(seeded.groupId, seeded.memberIds[0], 'content once');
    const submissionId = await seedSubmissionRow(seeded);

    const first = await seal(seeded.groupId, submissionId);
    const second = await seal(seeded.groupId, submissionId);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.json.sha256).toBe(first.json.sha256);
    const [rows] = await pool.query('SELECT COUNT(*) AS n FROM group_doc_snapshots WHERE group_id = ?', [seeded.groupId]);
    expect(rows[0].n).toBe(1);
  });

  it('after sealing, new clients open read-only and cannot change the doc', async () => {
    const seeded = await seedGroup(pool);
    await typeAndSync(seeded.groupId, seeded.memberIds[0], 'final words');
    const submissionId = await seedSubmissionRow(seeded);
    await seal(seeded.groupId, submissionId);

    // Attacker-style attempt: connect and try to append.
    const document = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: `ws://127.0.0.1:${server.wsPort}`,
      name: `group:${seeded.groupId}`,
      document,
      token: signJwt({ sub: seeded.memberIds[0], role: 'student' }, TEST_JWT_SECRET),
    });
    await waitFor(async () => provider.synced);
    const frag = document.getXmlFragment('default');
    expect(frag.toString()).toContain('final words');
    frag.insert(frag.length, [new Y.XmlText('SMUGGLED')]);
    await new Promise((r) => setTimeout(r, 400));
    provider.destroy();

    // A fresh client must NOT see the smuggled text.
    const d2 = new Y.Doc();
    const p2 = new HocuspocusProvider({
      url: `ws://127.0.0.1:${server.wsPort}`,
      name: `group:${seeded.groupId}`,
      document: d2,
      token: signJwt({ sub: seeded.memberIds[1], role: 'student' }, TEST_JWT_SECRET),
    });
    await waitFor(async () => p2.synced);
    expect(d2.getXmlFragment('default').toString()).not.toContain('SMUGGLED');
    p2.destroy();
  });

  it('the freeze survives a server restart (durable epoch)', async () => {
    const seeded = await seedGroup(pool);
    await typeAndSync(seeded.groupId, seeded.memberIds[0], 'persisted before seal');
    const submissionId = await seedSubmissionRow(seeded);
    await seal(seeded.groupId, submissionId);
    await server.destroy();

    server = await startTestServer();
    const d2 = new Y.Doc();
    const p2 = new HocuspocusProvider({
      url: `ws://127.0.0.1:${server.wsPort}`,
      name: `group:${seeded.groupId}`,
      document: d2,
      token: signJwt({ sub: seeded.memberIds[0], role: 'student' }, TEST_JWT_SECRET),
    });
    await waitFor(async () => p2.synced);
    const frag = d2.getXmlFragment('default');
    expect(frag.toString()).toContain('persisted before seal');
    frag.insert(frag.length, [new Y.XmlText('AFTER RESTART')]);
    await new Promise((r) => setTimeout(r, 400));
    p2.destroy();

    const d3 = new Y.Doc();
    const p3 = new HocuspocusProvider({
      url: `ws://127.0.0.1:${server.wsPort}`,
      name: `group:${seeded.groupId}`,
      document: d3,
      token: signJwt({ sub: seeded.memberIds[1], role: 'student' }, TEST_JWT_SECRET),
    });
    await waitFor(async () => p3.synced);
    expect(d3.getXmlFragment('default').toString()).not.toContain('AFTER RESTART');
    p3.destroy();
  }, 60000);
});
