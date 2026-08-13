import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getHarness, apiCall, registerUser } from './helpers/harness.js';

let h;
let lecturer;
let student;

beforeAll(async () => {
  h = await getHarness();
  lecturer = await registerUser(h.api, { name: 'Assign Lecturer', role: 'lecturer' });
  student = await registerUser(h.api, { name: 'Assign Student' });
});

afterAll(async () => { await h.close(); });

const createAssignment = (token, body) =>
  apiCall(h.api, 'assignments', { method: 'POST', token, body: { title: 'X', ...body } });

describe('GET /api/assignments', () => {
  it('requires a token (401)', async () => {
    const { status } = await apiCall(h.api, 'assignments');
    expect(status).toBe(401);
  });

  it('lecturer sees only their own assignments', async () => {
    const other = await registerUser(h.api, { name: 'Other Lecturer', role: 'lecturer' });
    const a1 = await createAssignment(lecturer.token, { title: 'Mine' });
    await createAssignment(other.token, { title: 'Theirs' });
    const { status, json } = await apiCall(h.api, 'assignments', { token: lecturer.token });
    expect(status).toBe(200);
    const mine = json.assignments.find((a) => a.id === a1.json.assignment.id);
    expect(mine).toBeTruthy();
    expect(json.assignments.every((a) => a.title !== 'Theirs')).toBe(true);
  });

  it('student sees assignments with their submission status', async () => {
    const created = await createAssignment(lecturer.token, { title: 'Student List' });
    const aid = created.json.assignment.id;
    await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const { status, json } = await apiCall(h.api, 'assignments', { token: student.token });
    expect(status).toBe(200);
    const a = json.assignments.find((x) => x.id === aid);
    expect(a).toBeTruthy();
    expect(a.submission_id).toBeTruthy();
    expect(a.submission_status).toBe('draft');
  });

  it('lecturer sees aggregate counts for individual and group assignments', async () => {
    // Seeded directly through the harness DB so the list aggregates have a
    // deterministic shape: one individual assignment and one group assignment
    // with mixed groups (fully-done, frozen-with-override, still in progress).
    const ind = await createAssignment(lecturer.token, { title: 'Agg Ind', is_group_work: 0 });
    const indId = ind.json.assignment.id;
    const s1 = await registerUser(h.api, { name: 'Agg One' });
    const s2 = await registerUser(h.api, { name: 'Agg Two' });
    const s3 = await registerUser(h.api, { name: 'Agg Three' });
    const s4 = await registerUser(h.api, { name: 'Agg Four' });
    const s5 = await registerUser(h.api, { name: 'Agg Five' });

    // Individual: two submitted, one draft (draft excluded from submitted_count).
    for (const sid of [s1.user.id, s2.user.id]) {
      await h.pool.query(
        "INSERT INTO submissions (assignment_id, student_id, status, submitted_at) VALUES (?, ?, 'submitted', NOW())",
        [indId, sid],
      );
    }
    await h.pool.query(
      "INSERT INTO submissions (assignment_id, student_id, content, status) VALUES (?, ?, ?, 'draft')",
      [indId, s5.user.id, 'draft body'],
    );

    const grp = await createAssignment(lecturer.token, { title: 'Agg Group', is_group_work: 1 });
    const grpId = grp.json.assignment.id;

    let rnd = 1;
    const insertGroup = async (name, leaderId) => {
      const [r] = await h.pool.query(
        'INSERT INTO `groups` (assignment_id, name, leader_id, invite_code) VALUES (?, ?, ?, ?)',
        [grpId, name, leaderId, `AGG${Date.now()}${rnd}`],
      );
      rnd += 1;
      return r.insertId;
    };

    // Group A: frozen, every member Done, no override -> submitted, not flagged.
    const ga = await insertGroup('Team Complete', s1.user.id);
    for (const sid of [s1.user.id, s2.user.id]) {
      await h.pool.query('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)', [ga, sid]);
      await h.pool.query("INSERT INTO group_member_status (group_id, student_id, status, done_at) VALUES (?, ?, 'done', NOW())", [ga, sid]);
    }
    await h.pool.query('UPDATE `groups` SET frozen_at = NOW() WHERE id = ?', [ga]);
    await h.pool.query(
      "INSERT INTO submissions (assignment_id, student_id, status, group_id, override_used) VALUES (?, ?, 'submitted', ?, 0)",
      [grpId, s1.user.id, ga],
    );

    // Group B: frozen with a member still in_progress + override record -> flagged.
    const gb = await insertGroup('Team Override', s3.user.id);
    for (const sid of [s3.user.id, s4.user.id]) {
      await h.pool.query('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)', [gb, sid]);
    }
    await h.pool.query("INSERT INTO group_member_status (group_id, student_id, status, done_at) VALUES (?, ?, 'done', NOW())", [gb, s3.user.id]);
    await h.pool.query("INSERT INTO group_member_status (group_id, student_id, status) VALUES (?, ?, 'in_progress')", [gb, s4.user.id]);
    await h.pool.query('UPDATE `groups` SET frozen_at = NOW() WHERE id = ?', [gb]);
    await h.pool.query(
      "INSERT INTO submissions (assignment_id, student_id, status, group_id, override_used, override_reason) VALUES (?, ?, 'submitted', ?, 1, 'member fell ill')",
      [grpId, s3.user.id, gb],
    );

    // Group C: never frozen -> counted in group_count only.
    await insertGroup('Team WIP', s2.user.id);

    const { status, json } = await apiCall(h.api, 'assignments', { token: lecturer.token });
    expect(status).toBe(200);

    const indRow = json.assignments.find((x) => x.id === indId);
    expect(indRow.group_count).toBe(0);
    expect(indRow.submitted_group_count).toBe(0);
    expect(indRow.flagged_group_count).toBe(0);
    expect(indRow.submitted_count).toBe(2);

    const grpRow = json.assignments.find((x) => x.id === grpId);
    expect(grpRow.group_count).toBe(3);
    expect(grpRow.submitted_group_count).toBe(2);
    expect(grpRow.flagged_group_count).toBe(1);
    expect(grpRow.submitted_count).toBe(0);
  });
});

describe('POST /api/assignments', () => {
  it('creates an assignment as lecturer', async () => {
    const { status, json } = await createAssignment(lecturer.token, {
      title: 'Group Assignment', description: 'desc', is_group_work: 1, rubric: ['a', 'b'],
    });
    expect(status).toBe(201);
    expect(json.assignment.title).toBe('Group Assignment');
    expect(json.assignment.is_group_work).toBeUndefined(); // not in create response
    const [[row]] = await h.pool.query('SELECT is_group_work, rubric FROM assignments WHERE id = ?', [json.assignment.id]);
    expect(row.is_group_work).toBe(1);
    // mysql2 returns JSON columns pre-parsed to arrays.
    expect(row.rubric).toEqual(['a', 'b']);
  });

  it('rejects a student with 403', async () => {
    const { status, json } = await createAssignment(student.token, { title: 'Nope' });
    expect(status).toBe(403);
    expect(json.error).toBe('Forbidden');
  });

  it('rejects missing title with 422', async () => {
    const { status, json } = await apiCall(h.api, 'assignments', { method: 'POST', token: lecturer.token, body: {} });
    expect(status).toBe(422);
    expect(json.error).toBe('Missing required field: title');
  });
});

describe('GET /api/assignments/:id', () => {
  it('returns 404 for missing assignment', async () => {
    const { status, json } = await apiCall(h.api, 'assignments/999999', { token: lecturer.token });
    expect(status).toBe(404);
    expect(json.error).toBe('Assignment not found');
  });

  it('lecturer owner sees submissions + roster with member emails', async () => {
    const created = await createAssignment(lecturer.token, { title: 'Roster', is_group_work: 1 });
    const aid = created.json.assignment.id;
    const s1 = await registerUser(h.api, { name: 'Member One' });
    const s2 = await registerUser(h.api, { name: 'Member Two' });
    const g = await apiCall(h.api, 'groups', { method: 'POST', token: s1.token, body: { assignment_id: aid, name: 'Team A' } });
    await apiCall(h.api, 'groups/join', { method: 'POST', token: s2.token, body: { invite_code: g.json.group.invite_code } });

    const { status, json } = await apiCall(h.api, `assignments/${aid}`, { token: lecturer.token });
    expect(status).toBe(200);
    expect(Array.isArray(json.assignment.groups)).toBe(true);
    const team = json.assignment.groups.find((x) => x.id === g.json.group.id);
    expect(team).toBeTruthy();
    expect(team.leader_name).toBe('Member One');
    expect(team.member_count).toBe(2);
    const emails = team.members.map((m) => m.email);
    expect(emails).toContain(s1.user.email);
    expect(emails).toContain(s2.user.email);
    expect(team.members[0].status).toBe('not_started');
  });

  it('lecturer non-owner sees empty submissions (no 403 on GET)', async () => {
    const other = await registerUser(h.api, { name: 'Other Owner', role: 'lecturer' });
    const created = await createAssignment(other.token, { title: 'Not Mine Roster' });
    const { status, json } = await apiCall(h.api, `assignments/${created.json.assignment.id}`, { token: lecturer.token });
    expect(status).toBe(200);
    expect(json.assignment.submissions).toEqual([]);
  });
});

describe('PUT /api/assignments/:id', () => {
  it('updates fields as owner', async () => {
    const created = await createAssignment(lecturer.token, { title: 'Before', is_group_work: 0 });
    const aid = created.json.assignment.id;
    const { status, json } = await apiCall(h.api, `assignments/${aid}`, {
      method: 'PUT', token: lecturer.token, body: { title: 'After', is_group_work: 1 },
    });
    expect(status).toBe(200);
    expect(json.assignment.title).toBe('After');
    const [[row]] = await h.pool.query('SELECT is_group_work FROM assignments WHERE id = ?', [aid]);
    expect(row.is_group_work).toBe(1);
  });

  it('rejects non-owner with 403', async () => {
    const other = await registerUser(h.api, { name: 'Owner2', role: 'lecturer' });
    const created = await createAssignment(other.token, { title: 'Locked' });
    const { status, json } = await apiCall(h.api, `assignments/${created.json.assignment.id}`, { method: 'PUT', token: lecturer.token, body: { title: 'Hack' } });
    expect(status).toBe(403);
  });

  it('rejects no fields with 422', async () => {
    const created = await createAssignment(lecturer.token, { title: 'NoChange' });
    const { status, json } = await apiCall(h.api, `assignments/${created.json.assignment.id}`, { method: 'PUT', token: lecturer.token, body: {} });
    expect(status).toBe(422);
    expect(json.error).toBe('No fields to update');
  });
});

describe('DELETE /api/assignments/:id', () => {
  it('deletes as owner', async () => {
    const created = await createAssignment(lecturer.token, { title: 'ToDelete' });
    const aid = created.json.assignment.id;
    const { status, json } = await apiCall(h.api, `assignments/${aid}`, { method: 'DELETE', token: lecturer.token });
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    const [[row]] = await h.pool.query('SELECT id FROM assignments WHERE id = ?', [aid]);
    expect(row).toBeUndefined();
  });

  it('rejects non-owner with 403', async () => {
    const other = await registerUser(h.api, { name: 'Owner3', role: 'lecturer' });
    const created = await createAssignment(other.token, { title: 'CannotDelete' });
    const { status } = await apiCall(h.api, `assignments/${created.json.assignment.id}`, { method: 'DELETE', token: lecturer.token });
    expect(status).toBe(403);
  });
});