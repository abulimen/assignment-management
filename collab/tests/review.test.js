// Review payload for sealed realtime submissions: playback.php serves the
// snapshot (never the live doc), per-member surviving-text contributions,
// and the override record. Legacy merged submissions keep their shape.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import {
  getPool, startTestServer, waitFor, TEST_JWT_SECRET, TEST_INTERNAL_SECRET, TEST_DB,
} from './helpers/testenv.js';
import { startPhpApi, apiCall, registerUser } from './helpers/phpharness.js';

const PHP_PORT = 18121;

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
  lecturer = await registerUser(php, { name: 'Review Lecturer', role: 'lecturer' });
  const created = await apiCall(php, 'assignments.php', {
    method: 'POST',
    token: lecturer.token,
    body: { title: 'Review Assignment', is_group_work: 1 },
  });
  assignmentId = created.json.assignment.id;
});

afterAll(async () => {
  php?.kill();
  await server?.destroy();
  await pool?.end();
});

function paragraphWith(text, authorId) {
  const p = new Y.XmlElement('paragraph');
  const t = new Y.XmlText(text);
  t.format(0, text.length, { author: { authorId } });
  p.insert(0, [t]);
  return p;
}

async function makeSubmittedGroup({ allDone = true, overrideReason = null } = {}) {
  const leader = await registerUser(php, { name: 'Rev Leader' });
  const mate = await registerUser(php, { name: 'Rev Mate' });
  const created = await apiCall(php, 'groups.php', {
    method: 'POST',
    token: leader.token,
    body: { assignment_id: assignmentId, name: 'Review Team' },
  });
  const group = created.json.group;
  await apiCall(php, 'group.php/join', { method: 'POST', token: mate.token, body: { invite_code: group.invite_code } });

  // Each member needs an anchor submission (normally created by GroupEditor).
  const anchorIds = {};
  for (const m of [leader, mate]) {
    const r = await apiCall(php, 'submissions.php', { method: 'POST', token: m.token, body: { assignment_id: assignmentId } });
    anchorIds[m.user.id] = r.json.submission.id;
  }

  // Write authored content into the shared doc.
  const document = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: `ws://127.0.0.1:${server.wsPort}`,
    name: `group:${group.id}`,
    document,
    token: leader.token,
  });
  await waitFor(async () => provider.synced);
  const frag = document.getXmlFragment('default');
  frag.insert(0, [
    paragraphWith('leader wrote this part', leader.user.id),
    paragraphWith('mate wrote these words', mate.user.id),
  ]);
  await new Promise((r) => setTimeout(r, 400));
  provider.destroy();
  await new Promise((r) => setTimeout(r, 200));

  await apiCall(php, `group_status.php/${group.id}/done`, { method: 'POST', token: leader.token, body: {} });
  if (allDone) {
    await apiCall(php, `group_status.php/${group.id}/done`, { method: 'POST', token: mate.token, body: {} });
  }

  const sub = await apiCall(php, `group_submit.php/${group.id}`, {
    method: 'POST',
    token: leader.token,
    body: overrideReason ? { override_reason: overrideReason } : {},
  });
  expect(sub.status).toBe(200);
  return { group, leader, mate, anchorIds, submissionId: sub.json.submission_id };
}

describe('playback.php for sealed realtime submissions', () => {
  it('serves the sealed snapshot with per-member surviving-text contributions', async () => {
    const { leader, mate, anchorIds, submissionId } = await makeSubmittedGroup({ allDone: true });

    const res = await apiCall(php, `playback.php/${submissionId}`, { token: lecturer.token });
    expect(res.status).toBe(200);
    const d = res.json;

    expect(d.realtime).toBe(true);
    expect(d.content).toContain('leader wrote this part');
    expect(d.override).toBeNull();

    expect(d.sections).toHaveLength(2);
    const byId = Object.fromEntries(d.sections.map((s) => [String(s.student_id), s]));
    const lead = byId[String(leader.user.id)];
    const mateS = byId[String(mate.user.id)];
    expect(lead.submission_id).toBe(anchorIds[leader.user.id]);
    expect(lead.surviving_chars).toBe('leader wrote this part'.length);
    expect(mateS.surviving_chars).toBe('mate wrote these words'.length);
    expect(Array.isArray(lead.pasted_texts)).toBe(true);
    expect(lead.student_name).toBe('Rev Leader');
    // Share percentages sum to ~100.
    const totalShare = d.sections.reduce((sum, s) => sum + Number(s.share_pct || 0), 0);
    expect(totalShare).toBeGreaterThan(99);
    expect(totalShare).toBeLessThan(101);
  });

  it('carries the override record: who was not Done and why', async () => {
    const { mate, submissionId } = await makeSubmittedGroup({
      allDone: false,
      overrideReason: 'deadline is tonight, no response for days',
    });

    const res = await apiCall(php, `playback.php/${submissionId}`, { token: lecturer.token });
    expect(res.status).toBe(200);
    const d = res.json;

    expect(d.override).toBeTruthy();
    expect(d.override.used).toBe(true);
    expect(d.override.reason).toBe('deadline is tonight, no response for days');
    expect(d.override.by_name).toBe('Rev Leader');
    expect(d.override.non_done.map((n) => n.student_id)).toContain(mate.user.id);
    expect(Array.isArray(d.done_vector)).toBe(true);
  });

  it('students who are not the submitter cannot open someone else\'s group review', async () => {
    const { submissionId } = await makeSubmittedGroup({ allDone: true });
    const outsider = await registerUser(php, { name: 'Review Outsider' });
    const res = await apiCall(php, `playback.php/${submissionId}`, { token: outsider.token });
    expect(res.status).toBe(403);
  });

  it('legacy merged submissions keep the old review shape (regression)', async () => {
    // Seed a legacy merged submission the old way: section rows + merged row.
    const leader = await registerUser(php, { name: 'Legacy Leader' });
    const a = await apiCall(php, 'assignments.php', {
      method: 'POST',
      token: lecturer.token,
      body: { title: 'Legacy Assignment', is_group_work: 1 },
    });
    const assignment2 = a.json.assignment.id;
    const g = await apiCall(php, 'groups.php', {
      method: 'POST',
      token: leader.token,
      body: { assignment_id: assignment2, name: 'Legacy Team' },
    });
    const groupId = g.json.group.id;

    const [secSub] = await pool.query(
      "INSERT INTO submissions (assignment_id, student_id, content, status) VALUES (?, ?, ?, 'draft')",
      [assignment2, leader.user.id, JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'section text', marks: [{ type: 'author', attrs: { authorId: leader.user.id } }] }] }] })],
    );
    await pool.query('INSERT INTO submission_stats (submission_id) VALUES (?)', [secSub.insertId]);
    await pool.query(
      'INSERT INTO group_sections (group_id, student_id, submission_id, sort_order, title, merged) VALUES (?, ?, ?, 0, ?, 1)',
      [groupId, leader.user.id, secSub.insertId, 'My Section'],
    );
    const [merged] = await pool.query(
      "INSERT INTO submissions (assignment_id, student_id, content, status) VALUES (?, ?, ?, 'submitted')",
      [assignment2, leader.user.id, JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'section text', marks: [{ type: 'author', attrs: { authorId: leader.user.id } }] }] }] })],
    );
    await pool.query('UPDATE `groups` SET merged_submission_id = ? WHERE id = ?', [merged.insertId, groupId]);

    const res = await apiCall(php, `playback.php/${merged.insertId}`, { token: lecturer.token });
    expect(res.status).toBe(200);
    const d = res.json;
    // Legacy shape: sections come from group_sections with titles; no realtime flag.
    expect(d.realtime ?? false).toBe(false);
    expect(d.sections).toHaveLength(1);
    expect(d.sections[0].title).toBe('My Section');
    expect(d.override ?? null).toBeNull();
  });
});
