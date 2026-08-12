import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getHarness, apiCall, registerUser } from './helpers/harness.js';

let h;
let lecturer;

beforeAll(async () => {
  h = await getHarness();
  lecturer = await registerUser(h.api, { name: 'Workflow Lecturer', role: 'lecturer' });
});

afterAll(async () => { await h.close(); });

async function makeGroup(memberCount = 2) {
  const created = await apiCall(h.api, 'assignments', { method: 'POST', token: lecturer.token, body: { title: 'Workflow Work', is_group_work: 1 } });
  const aid = created.json.assignment.id;
  const members = [];
  for (let i = 0; i < memberCount; i++) members.push(await registerUser(h.api, { name: `WF ${i}` }));
  const g = await apiCall(h.api, 'groups', { method: 'POST', token: members[0].token, body: { assignment_id: aid, name: 'Workflow Team' } });
  for (const m of members.slice(1)) {
    await apiCall(h.api, 'groups/join', { method: 'POST', token: m.token, body: { invite_code: g.json.group.invite_code } });
  }
  return { aid, group: g.json.group, leader: members[0], members };
}

const done = (gid, token) => apiCall(h.api, `groups/${gid}/done`, { method: 'POST', token, body: {} });
const reopen = (gid, token) => apiCall(h.api, `groups/${gid}/reopen`, { method: 'POST', token, body: {} });
const submit = (gid, token, body = {}) => apiCall(h.api, `groups/${gid}/submit`, { method: 'POST', token, body });
const fetchGroup = (token, gid) => apiCall(h.api, `groups/${gid}`, { token }).then((r) => r.json.group);
// mysql2 returns JSON columns already parsed; guard for drivers that hand back strings.
const parseJsonCol = (v) => (typeof v === 'string' ? JSON.parse(v) : v);

describe('POST /api/groups/:id/done + /reopen', () => {
  it('done records a doc hash + status; reopen clears it', async () => {
    const { group, leader } = await makeGroup(1);
    const doneRes = await done(group.id, leader.token);
    expect(doneRes.status).toBe(200);
    expect(doneRes.json.members[0].status).toBe('done');

    // The done endpoint returns only status fields; the doc hash is on the
    // group detail (mirrors group_status.php).
    const after = await fetchGroup(leader.token, group.id);
    const me = after.members.find((m) => parseInt(m.student_id) === leader.user.id);
    expect(me.status).toBe('done');
    expect(me.done_doc_sha).toMatch(/^[0-9a-f]{64}$/);

    const reopenRes = await reopen(group.id, leader.token);
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.json.members[0].status).toBe('in_progress');
    expect(reopenRes.json.members[0].done_at).toBe(null);

    // Reopen clears the doc hash / commitment (verified on group detail).
    const afterReopen = await fetchGroup(leader.token, group.id);
    const me2 = afterReopen.members.find((m) => parseInt(m.student_id) === leader.user.id);
    expect(me2.status).toBe('in_progress');
    expect(me2.done_doc_sha).toBeFalsy();
  });

  it('403 for a non-member', async () => {
    const { group } = await makeGroup(1);
    const outsider = await registerUser(h.api, { name: 'Workflow Outsider' });
    const { status } = await done(group.id, outsider.token);
    expect(status).toBe(403);
  });

  it('409 when the group is frozen', async () => {
    const { group, leader } = await makeGroup(1);
    await h.pool.query('UPDATE `groups` SET frozen_at = NOW() WHERE id = ?', [group.id]);
    const { status, json } = await done(group.id, leader.token);
    expect(status).toBe(409);
    expect(json.error).toBe('Group document is already submitted');
  });

  it('503 when the collab server is unreachable (no client-provided hash)', async () => {
    const { group, leader } = await makeGroup(1);
    const isolated = await (await import('./helpers/harness.js')).startApi({
      config: { analyzerUrl: `http://127.0.0.1:${h.analyzerPort}`, collabUrl: 'http://127.0.0.1:19999' },
    });
    try {
      const res = await done(group.id, leader.token);
      // Main API points at the working stub, so this verifies the happy path.
      expect(res.status).toBe(200);
      // Now verify the isolated server (dead collab) returns 503.
      const res2 = await apiCall(isolated, `groups/${group.id}/done`, { method: 'POST', token: leader.token, body: {} });
      expect(res2.status).toBe(503);
      expect(res2.json.error).toMatch(/collab/i);
    } finally {
      await isolated.close();
    }
  });
});

describe('POST /api/groups/:id/submit', () => {
  it('submits normally when every member is done', async () => {
    const { group, leader, members } = await makeGroup(2);
    for (const m of members) await done(group.id, m.token);

    const res = await submit(group.id, leader.token);
    expect(res.status).toBe(200);
    expect(res.json.override_used).toBe(false);
    expect(res.json.non_done_members).toEqual([]);

    const [[row]] = await h.pool.query('SELECT * FROM submissions WHERE id = ?', [res.json.submission_id]);
    expect(row.status).toBe('submitted');
    expect(row.group_id).toBe(group.id);
    expect(row.override_used).toBe(0);
    expect(row.content).toContain('the group essay');
    const doneVector = parseJsonCol(row.done_vector);
    expect(doneVector.map((d) => d.student_id).sort()).toEqual(members.map((m) => m.user.id).sort());
    const [[stats]] = await h.pool.query('SELECT word_count FROM submission_stats WHERE submission_id = ?', [res.json.submission_id]);
    expect(stats.word_count).toBe(3); // "the group essay"

    const [[grp]] = await h.pool.query('SELECT frozen_at, merged_submission_id FROM `groups` WHERE id = ?', [group.id]);
    expect(grp.frozen_at).toBeTruthy();
    expect(grp.merged_submission_id).toBe(res.json.submission_id);
  });

  it('rejects when not everyone is done and no override reason', async () => {
    const { group, leader } = await makeGroup(2);
    await done(group.id, leader.token);
    const res = await submit(group.id, leader.token);
    expect(res.status).toBe(409);
    expect(res.json.error).toMatch(/not.*done|incomplete/i);
    const [[grp]] = await h.pool.query('SELECT frozen_at FROM `groups` WHERE id = ?', [group.id]);
    expect(grp.frozen_at).toBeNull();
  });

  it('leader override submits and records who was not done + why', async () => {
    const { group, leader, members } = await makeGroup(2);
    await done(group.id, leader.token);
    const res = await submit(group.id, leader.token, { override_reason: 'No response' });
    expect(res.status).toBe(200);
    const { submission_id } = res.json;
    const [[row]] = await h.pool.query('SELECT override_used, override_by, override_reason, non_done_members FROM submissions WHERE id = ?', [submission_id]);
    expect(row.override_used).toBe(1);
    expect(row.override_by).toBe(leader.user.id);
    expect(row.override_reason).toBe('No response');
    const nonDone = parseJsonCol(row.non_done_members);
    expect(nonDone.map((d) => d.student_id)).toContain(members[1].user.id);
  });

  it('403 for a non-leader (even with an override)', async () => {
    const { group, leader, members } = await makeGroup(2);
    for (const m of members) await done(group.id, m.token);
    const res = await submit(group.id, members[1].token, { override_reason: 'coup' });
    expect(res.status).toBe(403);
  });

  it('403 for a non-member', async () => {
    const { group, leader } = await makeGroup(1);
    await done(group.id, leader.token);
    const outsider = await registerUser(h.api, { name: 'Submit Outsider' });
    const res = await submit(group.id, outsider.token);
    expect(res.status).toBe(403);
  });

  it('409 for an already-sealed group', async () => {
    const { group, leader } = await makeGroup(1);
    await done(group.id, leader.token);
    const first = await submit(group.id, leader.token);
    expect(first.status).toBe(200);
    const second = await submit(group.id, leader.token);
    expect(second.status).toBe(409);
  });

  it('503 when the collab server is down (no client-content fallback, draft rolled back)', async () => {
    const { group, leader } = await makeGroup(1);
    await done(group.id, leader.token);
    const isolated = await (await import('./helpers/harness.js')).startApi({
      config: { analyzerUrl: `http://127.0.0.1:${h.analyzerPort}`, collabUrl: 'http://127.0.0.1:19998' },
    });
    try {
      const res = await apiCall(isolated, `groups/${group.id}/submit`, {
        method: 'POST', token: leader.token,
        body: { content: '{"type":"doc","content":[{"type":"text","text":"forged"}]}' },
      });
      expect(res.status).toBe(503);
      // Draft row must have been rolled back.
      const [[grp]] = await h.pool.query('SELECT frozen_at FROM `groups` WHERE id = ?', [group.id]);
      expect(grp.frozen_at).toBeNull();
      const [subs] = await h.pool.query('SELECT content FROM submissions WHERE group_id = ?', [group.id]);
      expect(subs.every((s) => !s.content || !s.content.includes('forged'))).toBe(true);
    } finally {
      await isolated.close();
    }
  });
});