// Full-stack status workflow: PHP endpoints + Node doc-state hash, exercised
// over real HTTP with real PHP-minted JWTs.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import {
  getPool, startTestServer, waitFor, TEST_JWT_SECRET, TEST_INTERNAL_SECRET, TEST_DB,
} from './helpers/testenv.js';
import { startPhpApi, apiCall, registerUser } from './helpers/phpharness.js';

const PHP_PORT = 18101;

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
  lecturer = await registerUser(php, { name: 'Lecturer', role: 'lecturer' });
  const created = await apiCall(php, 'assignments.php', {
    method: 'POST',
    token: lecturer.token,
    body: { title: 'Status Workflow Assignment', description: 'test', is_group_work: 1 },
  });
  assignmentId = created.json.assignment.id;
});

afterAll(async () => {
  php?.kill();
  await server?.destroy();
  await pool?.end();
});

async function makeGroupWithMembers(memberCount = 2) {
  const members = [];
  for (let i = 0; i < memberCount; i++) {
    members.push(await registerUser(php, { name: `Student ${i}` }));
  }
  const created = await apiCall(php, 'groups.php', {
    method: 'POST',
    token: members[0].token,
    body: { assignment_id: assignmentId, name: 'Team Rocket' },
  });
  const group = created.json.group;
  for (const m of members.slice(1)) {
    await apiCall(php, 'group.php/join', {
      method: 'POST',
      token: m.token,
      body: { invite_code: group.invite_code },
    });
  }
  return { group, members };
}

async function fetchGroup(token, groupId) {
  const { json } = await apiCall(php, `group.php/${groupId}`, { token });
  return json.group;
}

function memberStatus(group, userId) {
  return group.members.find((m) => parseInt(m.student_id) === userId);
}

describe('group status workflow (PHP + Node)', () => {
  it('marking Done records a server-computed doc hash and timestamp', async () => {
    const { group, members } = await makeGroupWithMembers(2);

    const res = await apiCall(php, `group_status.php/${group.id}/done`, {
      method: 'POST',
      token: members[0].token,
      body: {},
    });
    expect(res.status).toBe(200);

    const after = await fetchGroup(members[0].token, group.id);
    const me = memberStatus(after, members[0].user.id);
    expect(me.status).toBe('done');
    expect(me.done_doc_sha).toMatch(/^[0-9a-f]{64}$/);
    expect(me.done_at).toBeTruthy();

    const mate = memberStatus(after, members[1].user.id);
    expect(mate.status).toBe('not_started');
  });

  it('editing in the shared doc auto-flips a member to in_progress (full stack)', async () => {
    const { group, members } = await makeGroupWithMembers(2);
    const writer = members[1];

    const document = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: `ws://127.0.0.1:${server.wsPort}`,
      name: `group:${group.id}`,
      document,
      token: writer.token, // real PHP-minted JWT
    });
    await waitFor(async () => provider.synced);
    document.getXmlFragment('default').insert(0, [new Y.XmlText('writing my part')]);
    await new Promise((r) => setTimeout(r, 400));
    provider.destroy();

    await waitFor(async () => {
      const g = await fetchGroup(writer.token, group.id);
      return memberStatus(g, writer.user.id).status === 'in_progress' ? true : null;
    });
    const g = await fetchGroup(writer.token, group.id);
    const me = memberStatus(g, writer.user.id);
    expect(me.status).toBe('in_progress');
    expect(me.last_activity_at).toBeTruthy();
  });

  it('reopen flips Done back to in_progress and clears the commitment', async () => {
    const { group, members } = await makeGroupWithMembers(1);
    await apiCall(php, `group_status.php/${group.id}/done`, { method: 'POST', token: members[0].token, body: {} });

    const res = await apiCall(php, `group_status.php/${group.id}/reopen`, {
      method: 'POST',
      token: members[0].token,
      body: {},
    });
    expect(res.status).toBe(200);

    const after = await fetchGroup(members[0].token, group.id);
    const me = memberStatus(after, members[0].user.id);
    expect(me.status).toBe('in_progress');
    expect(me.done_at).toBeFalsy();
    expect(me.done_doc_sha).toBeFalsy();
  });

  it('a non-member cannot change statuses', async () => {
    const { group } = await makeGroupWithMembers(1);
    const outsider = await registerUser(php, { name: 'Outsider' });
    const res = await apiCall(php, `group_status.php/${group.id}/done`, {
      method: 'POST',
      token: outsider.token,
      body: {},
    });
    expect(res.status).toBe(403);
  });

  it('statuses are frozen after the group is sealed', async () => {
    const { group, members } = await makeGroupWithMembers(1);
    await pool.query('UPDATE `groups` SET frozen_at = NOW() WHERE id = ?', [group.id]);

    const res = await apiCall(php, `group_status.php/${group.id}/done`, {
      method: 'POST',
      token: members[0].token,
      body: {},
    });
    expect(res.status).toBe(409);
  });

  it('mark-Done fails loudly (503) when the collab server is unreachable', async () => {
    const { group, members } = await makeGroupWithMembers(1);
    const isolatedPhp = await startPhpApi({
      port: PHP_PORT + 1,
      dbName: TEST_DB,
      collabInternalUrl: 'http://127.0.0.1:19999', // nothing listens here
      internalSecret: TEST_INTERNAL_SECRET,
      jwtSecret: TEST_JWT_SECRET,
    });
    try {
      const res = await apiCall(isolatedPhp, `group_status.php/${group.id}/done`, {
        method: 'POST',
        token: members[0].token,
        body: {},
      });
      expect(res.status).toBe(503);
      expect(res.json.error).toMatch(/collab/i);
      // Crucially: no client-supplied hash was accepted.
      const after = await fetchGroup(members[0].token, group.id);
      expect(memberStatus(after, members[0].user.id).status).not.toBe('done');
    } finally {
      isolatedPhp.kill();
    }
  });
});
