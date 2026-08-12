// The submit gate, full stack: leader submits via PHP; the server seals; the
// override records exactly who wasn't Done and why.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import {
  getPool, startTestServer, waitFor, TEST_JWT_SECRET, TEST_INTERNAL_SECRET, TEST_DB,
} from './helpers/testenv.js';
import { startPhpApi, apiCall, registerUser } from './helpers/phpharness.js';

const PHP_PORT = 18111;

let pool;
let server;
let php;
let lecturer;
let assignmentId;

beforeAll(async () => {
  pool = await getPool();
  server = await startTestServer();
  php = await startPhpApi({
    port: PHP_PORT,
    dbName: TEST_DB,
    collabInternalUrl: `http://127.0.0.1:${server.internalPort}`,
    internalSecret: TEST_INTERNAL_SECRET,
    jwtSecret: TEST_JWT_SECRET,
  });
  lecturer = await registerUser(php, { name: 'Submit Lecturer', role: 'lecturer' });
  const created = await apiCall(php, 'assignments.php', {
    method: 'POST',
    token: lecturer.token,
    body: { title: 'Submit Gate Assignment', is_group_work: 1 },
  });
  assignmentId = created.json.assignment.id;
});

afterAll(async () => {
  php?.kill();
  await server?.destroy();
  await pool?.end();
});

async function makeGroup(memberCount = 2) {
  const members = [];
  for (let i = 0; i < memberCount; i++) members.push(await registerUser(php, { name: `Sub ${i}` }));
  const created = await apiCall(php, 'groups.php', {
    method: 'POST',
    token: members[0].token,
    body: { assignment_id: assignmentId, name: 'Submit Team' },
  });
  const group = created.json.group;
  for (const m of members.slice(1)) {
    await apiCall(php, 'group.php/join', { method: 'POST', token: m.token, body: { invite_code: group.invite_code } });
  }
  return { group, leader: members[0], members };
}

async function writeSomething(groupId, token) {
  const document = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${server.wsPort}`,
    name: `group:${groupId}`,
    document,
    token,
  });
  await waitFor(async () => provider.synced);
  document.getXmlFragment('default').insert(0, [new Y.XmlText('the group essay')]);
  await new Promise((r) => setTimeout(r, 300));
  provider.destroy();
  await new Promise((r) => setTimeout(r, 200));
}

const markDone = (groupId, token) =>
  apiCall(php, `group_status.php/${groupId}/done`, { method: 'POST', token, body: {} });

const submit = (groupId, token, body = {}) =>
  apiCall(php, `group_submit.php/${groupId}`, { method: 'POST', token, body });

const submissionRow = async (id) => {
  const [rows] = await pool.query('SELECT * FROM submissions WHERE id = ?', [id]);
  return rows[0];
};

// mysql2 returns JSON columns already parsed; older drivers hand back strings.
const parseJsonCol = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

describe('group submission gate (PHP + Node)', () => {
  it('submits normally when every member is Done', async () => {
    const { group, leader, members } = await makeGroup(2);
    await writeSomething(group.id, leader.token);
    for (const m of members) await markDone(group.id, m.token);

    const res = await submit(group.id, leader.token);
    expect(res.status).toBe(200);
    const subId = res.json.submission_id;

    const row = await submissionRow(subId);
    expect(row.status).toBe('submitted');
    expect(row.group_id).toBe(group.id);
    expect(row.override_used).toBe(0);
    expect(row.content).toContain('the group essay');
    expect(row.submitted_at).toBeInstanceOf(Date);
    const doneVector = parseJsonCol(row.done_vector);
    expect(doneVector.map((d) => d.student_id).sort()).toEqual(
      members.map((m) => m.user.id).sort(),
    );

    const [[grp]] = await pool.query('SELECT frozen_at, merged_submission_id FROM `groups` WHERE id = ?', [group.id]);
    expect(grp.frozen_at).toBeInstanceOf(Date);
    expect(grp.merged_submission_id).toBe(subId);
  });

  it('rejects submission when someone is not Done and no override reason given', async () => {
    const { group, leader, members } = await makeGroup(2);
    await writeSomething(group.id, leader.token);
    await markDone(group.id, leader.token); // only leader done

    const res = await submit(group.id, leader.token);
    expect(res.status).toBe(409);
    expect(res.json.error).toMatch(/not.*done|incomplete/i);

    // Group must NOT be frozen.
    const [[grp]] = await pool.query('SELECT frozen_at FROM `groups` WHERE id = ?', [group.id]);
    expect(grp.frozen_at).toBeNull();
  });

  it('leader override submits anyway and records who was not Done + why', async () => {
    const { group, leader, members } = await makeGroup(2);
    const slacker = members[1];
    await writeSomething(group.id, leader.token);
    await markDone(group.id, leader.token);

    const res = await submit(group.id, leader.token, { override_reason: 'Michael never responded' });
    expect(res.status).toBe(200);
    const row = await submissionRow(res.json.submission_id);
    expect(row.override_used).toBe(1);
    expect(row.override_by).toBe(leader.user.id);
    expect(row.override_reason).toBe('Michael never responded');
    const nonDone = parseJsonCol(row.non_done_members);
    expect(nonDone.map((d) => d.student_id)).toContain(slacker.user.id);
    const doneVector = parseJsonCol(row.done_vector);
    expect(doneVector.find((d) => d.student_id === leader.user.id).status).toBe('done');
  });

  it('a non-leader cannot submit (not even with an override)', async () => {
    const { group, leader, members } = await makeGroup(2);
    await writeSomething(group.id, leader.token);
    for (const m of members) await markDone(group.id, m.token);

    const res = await submit(group.id, members[1].token, { override_reason: 'coup' });
    expect(res.status).toBe(403);
  });

  it('a non-member cannot submit', async () => {
    const { group, leader } = await makeGroup(1);
    await writeSomething(group.id, leader.token);
    await markDone(group.id, leader.token);
    const outsider = await registerUser(php, { name: 'Outsider' });
    const res = await submit(group.id, outsider.token);
    expect(res.status).toBe(403);
  });

  it('an already-sealed group cannot be submitted twice', async () => {
    const { group, leader } = await makeGroup(1);
    await writeSomething(group.id, leader.token);
    await markDone(group.id, leader.token);
    const first = await submit(group.id, leader.token);
    expect(first.status).toBe(200);
    const second = await submit(group.id, leader.token);
    expect(second.status).toBe(409);
  });

  it('fails loudly with 503 when the collab server is down (no client-content fallback)', async () => {
    const { group, leader } = await makeGroup(1);
    await markDone(group.id, leader.token);

    const isolatedPhp = await startPhpApi({
      port: PHP_PORT + 1,
      dbName: TEST_DB,
      collabInternalUrl: 'http://127.0.0.1:19998',
      internalSecret: TEST_INTERNAL_SECRET,
      jwtSecret: TEST_JWT_SECRET,
    });
    try {
      const res = await apiCall(isolatedPhp, `group_submit.php/${group.id}`, {
        method: 'POST',
        token: leader.token,
        body: { content: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"forged"}]}]}' },
      });
      expect(res.status).toBe(503);
      // The forged client content must not have been stored.
      const [[grp]] = await pool.query('SELECT frozen_at FROM `groups` WHERE id = ?', [group.id]);
      expect(grp.frozen_at).toBeNull();
      const [subs] = await pool.query('SELECT content FROM submissions WHERE group_id = ?', [group.id]);
      expect(subs.every((s) => !s.content || !s.content.includes('forged'))).toBe(true);
    } finally {
      isolatedPhp.kill();
    }
  });
});
