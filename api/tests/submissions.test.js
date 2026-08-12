import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getHarness, apiCall, registerUser } from './helpers/harness.js';

let h;
let lecturer;
let student;

beforeAll(async () => {
  h = await getHarness();
  lecturer = await registerUser(h.api, { name: 'Sub Lecturer', role: 'lecturer' });
  student = await registerUser(h.api, { name: 'Sub Student' });
});

afterAll(async () => { await h.close(); });

async function makeAssignment(isGroupWork = 0) {
  const created = await apiCall(h.api, 'assignments', { method: 'POST', token: lecturer.token, body: { title: 'Sub Work', is_group_work: isGroupWork } });
  return created.json.assignment.id;
}

const DOC = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello world' }] }] });

describe('POST /api/submissions', () => {
  it('creates a draft submission + stats row', async () => {
    const aid = await makeAssignment();
    const { status, json } = await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    expect(status).toBe(201);
    expect(json.submission.status).toBe('draft');
    const [[stats]] = await h.pool.query('SELECT submission_id FROM submission_stats WHERE submission_id = ?', [json.submission.id]);
    expect(stats).toBeTruthy();
  });

  it('rejects a lecturer with 403', async () => {
    const aid = await makeAssignment();
    const { status, json } = await apiCall(h.api, 'submissions', { method: 'POST', token: lecturer.token, body: { assignment_id: aid } });
    expect(status).toBe(403);
    expect(json.error).toBe('Only students can submit');
  });

  it('404 for a missing assignment', async () => {
    const { status, json } = await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: 999999 } });
    expect(status).toBe(404);
    expect(json.error).toBe('Assignment not found');
  });

  it('permits a second submission (the unique per-assignment constraint was dropped)', async () => {
    const aid = await makeAssignment();
    await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const { status } = await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    expect(status).toBe(201);
  });
});

describe('GET /api/submissions/:id', () => {
  it('owner sees their submission with stats + pasted_texts', async () => {
    const aid = await makeAssignment();
    const created = await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const { status, json } = await apiCall(h.api, `submissions/${created.json.submission.id}`, { token: student.token });
    expect(status).toBe(200);
    expect(json.submission.student_email).toBe(student.user.email);
    expect(json.submission.section_merged).toBe(false);
    expect(json.submission.pasted_texts).toEqual([]);
  });

  it('404 for a missing submission', async () => {
    const { status, json } = await apiCall(h.api, 'submissions/999999', { token: student.token });
    expect(status).toBe(404);
    expect(json.error).toBe('Submission not found');
  });

  it('403 for an unrelated student', async () => {
    const aid = await makeAssignment();
    const created = await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const other = await registerUser(h.api, { name: 'Other Sub Student' });
    const { status, json } = await apiCall(h.api, `submissions/${created.json.submission.id}`, { token: other.token });
    expect(status).toBe(403);
    expect(json.error).toBe('Forbidden');
  });

  it('group-mate can view a submission', async () => {
    const aid = await makeAssignment(1);
    const s1 = await registerUser(h.api, { name: 'GM1' });
    const s2 = await registerUser(h.api, { name: 'GM2' });
    const g = await apiCall(h.api, 'groups', { method: 'POST', token: s1.token, body: { assignment_id: aid } });
    await apiCall(h.api, 'groups/join', { method: 'POST', token: s2.token, body: { invite_code: g.json.group.invite_code } });
    const sub = await apiCall(h.api, 'submissions', { method: 'POST', token: s1.token, body: { assignment_id: aid } });
    const { status } = await apiCall(h.api, `submissions/${sub.json.submission.id}`, { token: s2.token });
    expect(status).toBe(200);
  });
});

describe('POST /api/submissions/:id/submit', () => {
  it('submits and recomputes word_count', async () => {
    const aid = await makeAssignment();
    const created = await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid, content: DOC } });
    const sid = created.json.submission.id;
    const { status } = await apiCall(h.api, `submissions/${sid}/submit`, { method: 'POST', token: student.token, body: { content: DOC } });
    expect(status).toBe(200);
    const [[row]] = await h.pool.query('SELECT status, submitted_at FROM submissions WHERE id = ?', [sid]);
    expect(row.status).toBe('submitted');
    expect(row.submitted_at).toBeTruthy();
    const [[stats]] = await h.pool.query('SELECT word_count FROM submission_stats WHERE submission_id = ?', [sid]);
    expect(stats.word_count).toBe(2); // "hello world"
  });

  it('409 when already submitted', async () => {
    const aid = await makeAssignment();
    const created = await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const sid = created.json.submission.id;
    await apiCall(h.api, `submissions/${sid}/submit`, { method: 'POST', token: student.token, body: { content: DOC } });
    const { status, json } = await apiCall(h.api, `submissions/${sid}/submit`, { method: 'POST', token: student.token, body: { content: DOC } });
    expect(status).toBe(409);
    expect(json.error).toBe('Already submitted');
  });

  it('403 for a non-owner', async () => {
    const aid = await makeAssignment();
    const created = await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const other = await registerUser(h.api, { name: 'Not Owner S' });
    const { status } = await apiCall(h.api, `submissions/${created.json.submission.id}/submit`, { method: 'POST', token: other.token, body: { content: DOC } });
    expect(status).toBe(403);
  });
});

describe('GET /api/submissions?assignment_id=', () => {
  it('lists submissions for the assignment (lecturer sees all)', async () => {
    const aid = await makeAssignment();
    const other = await registerUser(h.api, { name: 'Sub Other' });
    await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    await apiCall(h.api, 'submissions', { method: 'POST', token: other.token, body: { assignment_id: aid } });
    const { status, json } = await apiCall(h.api, `submissions?assignment_id=${aid}`, { token: lecturer.token });
    expect(status).toBe(200);
    expect(json.submissions.length).toBe(2);
    expect(json.submissions[0]).toHaveProperty('student_name');
  });

  it('student sees only their own submission', async () => {
    const aid = await makeAssignment();
    const other = await registerUser(h.api, { name: 'Sub Other2' });
    await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    await apiCall(h.api, 'submissions', { method: 'POST', token: other.token, body: { assignment_id: aid } });
    const { status, json } = await apiCall(h.api, `submissions?assignment_id=${aid}`, { token: student.token });
    expect(status).toBe(200);
    expect(json.submissions.length).toBe(1);
    expect(json.submissions[0].student_id).toBe(student.user.id);
  });

  it('lecturer must own the assignment', async () => {
    const aid = await makeAssignment();
    const otherLecturer = await registerUser(h.api, { name: 'Sub Lecturer2', role: 'lecturer' });
    const { status } = await apiCall(h.api, `submissions?assignment_id=${aid}`, { token: otherLecturer.token });
    expect(status).toBe(403);
  });

  it('400 without assignment_id', async () => {
    const { status } = await apiCall(h.api, 'submissions', { token: lecturer.token });
    expect(status).toBe(400);
  });
});

describe('PUT /api/submissions/:id', () => {
  it('updates draft content', async () => {
    const aid = await makeAssignment();
    const created = await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const sid = created.json.submission.id;
    const { status, json } = await apiCall(h.api, `submissions/${sid}`, { method: 'PUT', token: student.token, body: { content: DOC } });
    expect(status).toBe(200);
    expect(json.submission.content).toBe(DOC);
  });

  it('409 when already submitted', async () => {
    const aid = await makeAssignment();
    const created = await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const sid = created.json.submission.id;
    await apiCall(h.api, `submissions/${sid}/submit`, { method: 'POST', token: student.token, body: { content: DOC } });
    const { status, json } = await apiCall(h.api, `submissions/${sid}`, { method: 'PUT', token: student.token, body: { content: DOC } });
    expect(status).toBe(409);
    expect(json.error).toBe('Cannot edit submitted submission');
  });
});