import { createHash } from 'node:crypto';
import { sendJson, sendError, guard, missingField } from '../http.js';

// 6-char uppercase invite code (mirrors groups.php's md5/uniqid truncation:
// 6 chars of an md5 hex, uppercased).
function generateInviteCode() {
  const s = `${Date.now()}${Math.random()}${Math.random()}`;
  return createHash('md5').update(s).digest('hex').slice(0, 6).toUpperCase();
}

// POST /api/groups — create a group (student only).
export default async function createGroup(ctx) {
  const user = guard(ctx);
  if (!user) return;
  if (user.role !== 'student') return sendError(ctx, 403, 'Only students can create groups');
  const data = ctx.body;
  if (missingField(data, 'assignment_id')) return sendError(ctx, 422, 'Missing required field: assignment_id');

  const [aRows] = await ctx.pool.query('SELECT course_id, is_group_work, target_type FROM assignments WHERE id = ?', [data.assignment_id]);
  const a = aRows[0];
  if (!a) return sendError(ctx, 404, 'Assignment not found');
  if (!Number(a.is_group_work)) return sendError(ctx, 422, 'This assignment is not group work');

  // Verify student is enrolled in course
  const [cm] = await ctx.pool.query(
    "SELECT 1 FROM course_members WHERE course_id = ? AND user_id = ? AND role = 'student'",
    [a.course_id, user.sub],
  );
  if (cm.length === 0) return sendError(ctx, 403, 'You are not enrolled in the course for this assignment');

  if (a.target_type === 'selected') {
    const [isPart] = await ctx.pool.query(
      'SELECT 1 FROM assignment_participants WHERE assignment_id = ? AND user_id = ?',
      [data.assignment_id, user.sub],
    );
    if (isPart.length === 0) return sendError(ctx, 403, 'You are not an assigned participant for this coursework');
  }

  const [existing] = await ctx.pool.query(`
    SELECT g.id FROM \`groups\` g
    JOIN group_members gm ON gm.group_id = g.id
    WHERE g.assignment_id = ? AND gm.student_id = ?
  `, [data.assignment_id, user.sub]);
  if (existing.length) return sendError(ctx, 409, 'You are already in a group for this assignment');

  const inviteCode = generateInviteCode();
  const name = data.name ?? `Group ${inviteCode}`;
  const [ir] = await ctx.pool.query(
    'INSERT INTO `groups` (assignment_id, name, leader_id, invite_code) VALUES (?, ?, ?, ?)',
    [data.assignment_id, name, user.sub, inviteCode],
  );
  const groupId = ir.insertId;
  await ctx.pool.query('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)', [groupId, user.sub]);
  await ctx.pool.query(
    "INSERT IGNORE INTO group_member_status (group_id, student_id, status) VALUES (?, ?, 'not_started')",
    [groupId, user.sub],
  );

  const [rows] = await ctx.pool.query(
    'SELECT g.*, u.name AS leader_name FROM `groups` g JOIN users u ON u.id = g.leader_id WHERE g.id = ?',
    [groupId],
  );
  sendJson(ctx, 201, { group: rows[0] });
}