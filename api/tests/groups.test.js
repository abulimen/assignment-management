import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getHarness, apiCall, registerUser } from './helpers/harness.js';

let h;
let lecturer;
let student;

beforeAll(async () => {
  h = await getHarness();
  lecturer = await registerUser(h.api, { name: 'Group Lecturer', role: 'lecturer' });
  student = await registerUser(h.api, { name: 'Group Student' });
});

afterAll(async () => { await h.close(); });

async function makeGroupAssignment() {
  const created = await apiCall(h.api, 'assignments', {
    method: 'POST', token: lecturer.token, body: { title: 'GroupWork', is_group_work: 1 },
  });
  return created.json.assignment.id;
}

describe('POST /api/groups', () => {
  it('creates a group with a name and auto membership', async () => {
    const aid = await makeGroupAssignment();
    const { status, json } = await apiCall(h.api, 'groups', {
      method: 'POST', token: student.token, body: { assignment_id: aid, name: 'Team Rocket' },
    });
    expect(status).toBe(201);
    expect(json.group.name).toBe('Team Rocket');
    expect(json.group.leader_name).toBe('Group Student');
    expect(json.group.invite_code).toMatch(/^[A-Z0-9]{6}$/);
    const [[row]] = await h.pool.query('SELECT student_id FROM group_members WHERE group_id = ?', [json.group.id]);
    expect(row.student_id).toBe(student.user.id);
  });

  it('defaults the name to Group <code>', async () => {
    const aid = await makeGroupAssignment();
    const { status, json } = await apiCall(h.api, 'groups', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    expect(status).toBe(201);
    expect(json.group.name).toBe(`Group ${json.group.invite_code}`);
  });

  it('rejects a lecturer with 403', async () => {
    const aid = await makeGroupAssignment();
    const { status, json } = await apiCall(h.api, 'groups', { method: 'POST', token: lecturer.token, body: { assignment_id: aid } });
    expect(status).toBe(403);
    expect(json.error).toBe('Only students can create groups');
  });

  it('404 for a missing assignment', async () => {
    const { status, json } = await apiCall(h.api, 'groups', { method: 'POST', token: student.token, body: { assignment_id: 999999 } });
    expect(status).toBe(404);
    expect(json.error).toBe('Assignment not found');
  });

  it('422 when the assignment is not group work', async () => {
    const created = await apiCall(h.api, 'assignments', { method: 'POST', token: lecturer.token, body: { title: 'Solo', is_group_work: 0 } });
    const { status, json } = await apiCall(h.api, 'groups', { method: 'POST', token: student.token, body: { assignment_id: created.json.assignment.id } });
    expect(status).toBe(422);
    expect(json.error).toBe('This assignment is not group work');
  });

  it('409 when already in a group for the assignment', async () => {
    const aid = await makeGroupAssignment();
    await apiCall(h.api, 'groups', { method: 'POST', token: student.token, body: { assignment_id: aid, name: 'First' } });
    const { status, json } = await apiCall(h.api, 'groups', { method: 'POST', token: student.token, body: { assignment_id: aid, name: 'Second' } });
    expect(status).toBe(409);
    expect(json.error).toBe('You are already in a group for this assignment');
  });
});

describe('POST /api/groups/join', () => {
  it('joins by invite code', async () => {
    const aid = await makeGroupAssignment();
    const leader = await registerUser(h.api, { name: 'Leader' });
    const joiner = await registerUser(h.api, { name: 'Joiner' });
    const g = await apiCall(h.api, 'groups', { method: 'POST', token: leader.token, body: { assignment_id: aid, name: 'Join Team' } });
    const { status, json } = await apiCall(h.api, 'groups/join', { method: 'POST', token: joiner.token, body: { invite_code: g.json.group.invite_code } });
    expect(status).toBe(200);
    expect(json.joined).toBe(true);
    const [[row]] = await h.pool.query('SELECT student_id FROM group_members WHERE group_id = ? AND student_id = ?', [g.json.group.id, joiner.user.id]);
    expect(row).toBeTruthy();
  });

  it('404 for an invalid invite code', async () => {
    const { status, json } = await apiCall(h.api, 'groups/join', { method: 'POST', token: student.token, body: { invite_code: 'ZZZZZZ' } });
    expect(status).toBe(404);
    expect(json.error).toBe('Invalid invite code');
  });

  it('409 when already a member', async () => {
    const aid = await makeGroupAssignment();
    const g = await apiCall(h.api, 'groups', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const { status, json } = await apiCall(h.api, 'groups/join', { method: 'POST', token: student.token, body: { invite_code: g.json.group.invite_code } });
    expect(status).toBe(409);
    expect(json.error).toBe('Already a member of this group');
  });
});

describe('GET /api/groups/:id', () => {
  it('returns group details + members for a member', async () => {
    const aid = await makeGroupAssignment();
    const g = await apiCall(h.api, 'groups', { method: 'POST', token: student.token, body: { assignment_id: aid, name: 'Detail Team' } });
    const { status, json } = await apiCall(h.api, `groups/${g.json.group.id}`, { token: student.token });
    expect(status).toBe(200);
    expect(json.group.assignment_title).toBe('GroupWork');
    expect(json.group.is_group_work).toBe(1);
    expect(json.group.members).toHaveLength(1);
    expect(json.group.members[0].email).toBe(student.user.email);
    expect(json.group.members[0].is_leader).toBe(1);
    expect(json.group.members[0].status).toBe('not_started');
  });

  it('403 for a non-member student', async () => {
    const aid = await makeGroupAssignment();
    const other = await registerUser(h.api, { name: 'NonMember' });
    const g = await apiCall(h.api, 'groups', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const { status, json } = await apiCall(h.api, `groups/${g.json.group.id}`, { token: other.token });
    expect(status).toBe(403);
    expect(json.error).toBe('Forbidden');
  });

  it('403 for a lecturer who does not own the assignment', async () => {
    const aid = await makeGroupAssignment();
    const other = await registerUser(h.api, { name: 'Other Grp Lecturer', role: 'lecturer' });
    const g = await apiCall(h.api, 'groups', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const { status } = await apiCall(h.api, `groups/${g.json.group.id}`, { token: other.token });
    expect(status).toBe(403);
  });
});

describe('GET /api/assignments/:id/groups', () => {
  it('lecturer owner sees roster with members', async () => {
    const aid = await makeGroupAssignment();
    const s1 = await registerUser(h.api, { name: 'R1' });
    const s2 = await registerUser(h.api, { name: 'R2' });
    const g = await apiCall(h.api, 'groups', { method: 'POST', token: s1.token, body: { assignment_id: aid } });
    await apiCall(h.api, 'groups/join', { method: 'POST', token: s2.token, body: { invite_code: g.json.group.invite_code } });
    const { status, json } = await apiCall(h.api, `assignments/${aid}/groups`, { token: lecturer.token });
    expect(status).toBe(200);
    const team = json.groups.find((x) => x.id === g.json.group.id);
    expect(team.members.map((m) => m.email)).toContain(s2.user.email);
  });

  it('403 for a lecturer who does not own the assignment', async () => {
    const aid = await makeGroupAssignment();
    const other = await registerUser(h.api, { name: 'Not Owner L', role: 'lecturer' });
    const { status } = await apiCall(h.api, `assignments/${aid}/groups`, { token: other.token });
    expect(status).toBe(403);
  });

  it('student sees only their own groups', async () => {
    const aid = await makeGroupAssignment();
    const other = await registerUser(h.api, { name: 'Other Student' });
    await apiCall(h.api, 'groups', { method: 'POST', token: other.token, body: { assignment_id: aid } });
    const g = await apiCall(h.api, 'groups', { method: 'POST', token: student.token, body: { assignment_id: aid } });
    const { status, json } = await apiCall(h.api, `assignments/${aid}/groups`, { token: student.token });
    expect(status).toBe(200);
    expect(json.groups).toHaveLength(1);
    expect(json.groups[0].id).toBe(g.json.group.id);
  });
});