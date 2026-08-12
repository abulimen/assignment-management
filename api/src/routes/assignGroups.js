import { sendJson, sendError, guard, parseIdParam } from '../http.js';
import { groupMembers } from '../roster.js';

// GET /api/assignments/:id/groups — lecturer roster (with members) or a
// student's own groups (no members expansion).
export default async function assignGroups(ctx) {
  const user = guard(ctx);
  if (!user) return;
  const id = parseIdParam(ctx, 'assignment_id required');
  if (id === null) return;

  if (user.role === 'lecturer') {
    const [aRows] = await ctx.pool.query('SELECT lecturer_id FROM assignments WHERE id = ?', [id]);
    const a = aRows[0];
    if (!a || Number(a.lecturer_id) !== user.sub) return sendError(ctx, 403, 'Forbidden');

    const [groups] = await ctx.pool.query(`
      SELECT g.*, u.name AS leader_name, COUNT(gm.id) AS member_count
      FROM \`groups\` g
      JOIN users u ON u.id = g.leader_id
      LEFT JOIN group_members gm ON gm.group_id = g.id
      WHERE g.assignment_id = ?
      GROUP BY g.id
    `, [id]);
    for (const g of groups) {
      g.members = await groupMembers(ctx.pool, g.id);
    }
    return sendJson(ctx, 200, { groups });
  }

  const [groups] = await ctx.pool.query(`
    SELECT g.*, u.name AS leader_name, COUNT(gm.id) AS member_count
    FROM \`groups\` g
    JOIN group_members gm ON gm.group_id = g.id
    JOIN users u ON u.id = g.leader_id
    WHERE g.assignment_id = ? AND gm.student_id = ?
    GROUP BY g.id
  `, [id, user.sub]);
  sendJson(ctx, 200, { groups });
}