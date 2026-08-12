// Server-anchored attribution: every change is logged against the
// AUTHENTICATED connection (never client-reported), first edit auto-flips
// not_started -> in_progress, and editing after marking Done flips back.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { signJwt } from '../src/jwt.js';
import {
  getPool, seedGroup, startTestServer, waitFor, TEST_JWT_SECRET,
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

async function editAs(groupId, userId, text, { holdMs = 300 } = {}) {
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
  await new Promise((r) => setTimeout(r, holdMs));
  provider.destroy();
  // Attribution is flushed on disconnect at the latest.
  await new Promise((r) => setTimeout(r, 200));
}

const statusOf = async (groupId, userId) => {
  const [rows] = await pool.query(
    'SELECT status, done_at, done_doc_sha, last_activity_at FROM group_member_status WHERE group_id = ? AND student_id = ?',
    [groupId, userId],
  );
  return rows[0];
};

const attributionOf = async (groupId, userId) => {
  const [rows] = await pool.query(
    'SELECT * FROM collab_attribution WHERE group_id = ? AND student_id = ? ORDER BY id',
    [groupId, userId],
  );
  return rows;
};

describe('server-anchored attribution', () => {
  it('logs edits under the authenticated user and auto-flips to in_progress', async () => {
    const seeded = await seedGroup(pool);
    const [m0, m1] = seeded.memberIds;

    await editAs(seeded.groupId, m0, 'aaa from m0');

    const rows = await attributionOf(seeded.groupId, m0);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.student_id).toBe(m0);
      expect(row.update_bytes).toBeGreaterThan(0);
      expect(row.received_at).toBeInstanceOf(Date);
    }

    const s0 = await statusOf(seeded.groupId, m0);
    expect(s0.status).toBe('in_progress');
    expect(s0.last_activity_at).toBeInstanceOf(Date);

    // Teammate who never touched the doc stays not_started, zero attribution.
    const s1 = await statusOf(seeded.groupId, m1);
    expect(s1.status).toBe('not_started');
    expect((await attributionOf(seeded.groupId, m1)).length).toBe(0);
  });

  it('attributes concurrent editors separately', async () => {
    const seeded = await seedGroup(pool);
    const [m0, m1] = seeded.memberIds;

    await editAs(seeded.groupId, m0, 'm0 words');
    await editAs(seeded.groupId, m1, 'm1 words');

    expect((await attributionOf(seeded.groupId, m0)).length).toBeGreaterThan(0);
    expect((await attributionOf(seeded.groupId, m1)).length).toBeGreaterThan(0);

    // No cross-contamination: every row belongs to the right user.
    const [all] = await pool.query(
      'SELECT student_id FROM collab_attribution WHERE group_id = ?',
      [seeded.groupId],
    );
    for (const row of all) {
      expect([m0, m1]).toContain(row.student_id);
    }
    expect((await statusOf(seeded.groupId, m0)).status).toBe('in_progress');
    expect((await statusOf(seeded.groupId, m1)).status).toBe('in_progress');
  });

  it('emits increasing update_seq across separate throttled flushes', async () => {
    const seeded = await seedGroup(pool);
    const [m0] = seeded.memberIds;

    // Two edits separated by more than the 2s attribution throttle.
    await editAs(seeded.groupId, m0, 'first flush', { holdMs: 2400 });
    await editAs(seeded.groupId, m0, 'second flush');

    const rows = await attributionOf(seeded.groupId, m0);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].update_seq).toBeGreaterThan(rows[i - 1].update_seq);
    }
  }, 30000);

  it('editing after marking Done flips the member back to in_progress', async () => {
    const seeded = await seedGroup(pool);
    const [m0] = seeded.memberIds;

    // Member marks themselves Done (task 3 endpoint does this via PHP;
    // here we set the DB state directly).
    await pool.query(
      "UPDATE group_member_status SET status = 'done', done_at = NOW(), done_doc_sha = REPEAT('a', 64) WHERE group_id = ? AND student_id = ?",
      [seeded.groupId, m0],
    );
    expect((await statusOf(seeded.groupId, m0)).status).toBe('done');

    await editAs(seeded.groupId, m0, 'oops, editing after done');

    await waitFor(async () => {
      const s = await statusOf(seeded.groupId, m0);
      return s.status === 'in_progress' ? s : null;
    });
    const after = await statusOf(seeded.groupId, m0);
    expect(after.status).toBe('in_progress');
    expect(after.done_at).toBeNull();
    expect(after.done_doc_sha).toBeNull();
  });
});
