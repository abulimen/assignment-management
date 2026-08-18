import { sendJson, sendError, guardRole } from '../http.js';

// POST /api/groups/join — join by invite code (student only).
export default async function joinGroup(ctx) {
  const user = guardRole(ctx, 'student');
  if (!user) return;
  const data = ctx.body;
  let code = data.invite_code ?? '';
  if (code === '') return sendError(ctx, 400, 'invite_code required');
  code = String(code).toUpperCase();

  const [gRows] = await ctx.pool.query('SELECT g.* FROM `groups` g WHERE g.invite_code = ?', [code]);
  const group = gRows[0];
  if (!group) return sendError(ctx, 404, 'Invalid invite code');

  // Verify student is enrolled in the assignment's course
  const [aRows] = await ctx.pool.query('SELECT course_id, target_type FROM assignments WHERE id = ?', [group.assignment_id]);
  const a = aRows[0];
  if (!a) return sendError(ctx, 404, 'Assignment not found');

  const [cm] = await ctx.pool.query(
    "SELECT 1 FROM course_members WHERE course_id = ? AND user_id = ? AND role = 'student'",
    [a.course_id, user.sub],
  );
  if (cm.length === 0) return sendError(ctx, 403, 'You are not enrolled in the course for this assignment');

  if (a.target_type === 'selected') {
    const [isPart] = await ctx.pool.query(
      'SELECT 1 FROM assignment_participants WHERE assignment_id = ? AND user_id = ?',
      [group.assignment_id, user.sub],
    );
    if (isPart.length === 0) return sendError(ctx, 403, 'You are not an assigned participant for this coursework');
  }

  const [mRows] = await ctx.pool.query('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?', [group.id, user.sub]);
  if (mRows.length) return sendError(ctx, 409, 'Already a member of this group');

  await ctx.pool.query('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)', [group.id, user.sub]);
  await ctx.pool.query(
    "INSERT IGNORE INTO group_member_status (group_id, student_id, status) VALUES (?, ?, 'not_started')",
    [group.id, user.sub],
  );
  sendJson(ctx, 200, { group, joined: true });
}