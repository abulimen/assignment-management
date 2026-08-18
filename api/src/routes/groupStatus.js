import { sendJson, sendError, guardRole, parseIdParam } from '../http.js';
import { collabRequest } from '../collab.js';

// POST /api/groups/:id/done and /api/groups/:id/reopen (student only).
export default async function groupStatus(ctx) {
  const user = guardRole(ctx, 'student');
  if (!user) return;

  const groupId = parseIdParam(ctx, 'Invalid group ID');
  const action = ctx.params.action;
  if (!groupId || !['done', 'reopen'].includes(action)) {
    return sendError(ctx, 400, 'Expected /api/groups/:id/<done|reopen>');
  }

  const [gRows] = await ctx.pool.query('SELECT id, frozen_at FROM `groups` WHERE id = ?', [groupId]);
  const group = gRows[0];
  if (!group) return sendError(ctx, 404, 'Group not found');
  if (group.frozen_at) return sendError(ctx, 409, 'Group document is already submitted');

  const [mRows] = await ctx.pool.query('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?', [groupId, user.sub]);
  if (!mRows.length) return sendError(ctx, 403, 'Forbidden');

  if (action === 'done') {
    const res = await collabRequest(ctx.config, 'GET', `/internal/doc/${groupId}/state`);
    if (!res.ok) return sendError(ctx, 503, 'Collaboration server unavailable — cannot mark Done right now');
    const sha = res.body && res.body.sha256;
    if (!sha) return sendError(ctx, 502, 'Collaboration server returned no document state');

    await ctx.pool.query(`
      INSERT INTO group_member_status (group_id, student_id, status, done_at, done_doc_sha)
      VALUES (?, ?, 'done', NOW(), ?)
      ON DUPLICATE KEY UPDATE status = 'done', done_at = NOW(), done_doc_sha = VALUES(done_doc_sha)
    `, [groupId, user.sub, sha]);
  } else { // reopen
    await ctx.pool.query(`
      UPDATE group_member_status
      SET status = 'in_progress', done_at = NULL, done_doc_sha = NULL
      WHERE group_id = ? AND student_id = ?
    `, [groupId, user.sub]);
  }

  const [members] = await ctx.pool.query(`
    SELECT gm.student_id, COALESCE(gms.status, 'not_started') AS status,
           gms.done_at, gms.last_activity_at
    FROM group_members gm
    LEFT JOIN group_member_status gms
      ON gms.group_id = gm.group_id AND gms.student_id = gm.student_id
    WHERE gm.group_id = ?
  `, [groupId]);
  sendJson(ctx, 200, { group_id: groupId, members });
}