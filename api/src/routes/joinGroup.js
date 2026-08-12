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

  const [mRows] = await ctx.pool.query('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?', [group.id, user.sub]);
  if (mRows.length) return sendError(ctx, 409, 'Already a member of this group');

  await ctx.pool.query('INSERT INTO group_members (group_id, student_id) VALUES (?, ?)', [group.id, user.sub]);
  await ctx.pool.query(
    "INSERT IGNORE INTO group_member_status (group_id, student_id, status) VALUES (?, ?, 'not_started')",
    [group.id, user.sub],
  );
  sendJson(ctx, 200, { group, joined: true });
}