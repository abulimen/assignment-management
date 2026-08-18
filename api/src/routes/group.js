import { sendJson, sendError, guard, parseIdParam } from '../http.js';

// GET /api/groups/:id — group detail + members (with realtime status).
export default async function group(ctx) {
  const user = guard(ctx);
  if (!user) return;
  const id = parseIdParam(ctx, 'Group ID required');
  if (id === null) return;

  const [rows] = await ctx.pool.query(`
    SELECT g.*, u.name AS leader_name, a.title AS assignment_title, a.is_group_work
    FROM \`groups\` g
    JOIN users u ON u.id = g.leader_id
    JOIN assignments a ON a.id = g.assignment_id
    WHERE g.id = ?
  `, [id]);
  const group = rows[0];
  if (!group) return sendError(ctx, 404, 'Group not found');

  if (user.role === 'student') {
    const [m] = await ctx.pool.query('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?', [id, user.sub]);
    if (!m.length) return sendError(ctx, 403, 'Forbidden');
  } else {
    const [aRows] = await ctx.pool.query('SELECT lecturer_id FROM assignments WHERE id = ?', [group.assignment_id]);
    const a = aRows[0];
    if (!a || Number(a.lecturer_id) !== user.sub) return sendError(ctx, 403, 'Forbidden');
  }

  const [members] = await ctx.pool.query(`
    SELECT gm.student_id, u.name AS student_name, u.email, u.student_id AS student_matric, gm.joined_at,
           (g.leader_id = gm.student_id) AS is_leader,
           COALESCE(gms.status, 'not_started') AS status,
           gms.done_at, gms.done_doc_sha, gms.last_activity_at
    FROM group_members gm
    JOIN \`groups\` g ON g.id = gm.group_id
    JOIN users u ON u.id = gm.student_id
    LEFT JOIN group_member_status gms
      ON gms.group_id = gm.group_id AND gms.student_id = gm.student_id
    WHERE gm.group_id = ?
    ORDER BY gm.joined_at ASC
  `, [id]);
  group.members = members;

  sendJson(ctx, 200, { group });
}