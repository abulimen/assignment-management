import { sendJson, sendError, guard, guardRole, missingField } from '../http.js';

// GET /api/assignments (list) and POST /api/assignments (create).
export default async function assignments(ctx) {
  const user = guard(ctx);
  if (!user) return;

  if (ctx.req.method === 'GET') {
    if (user.role === 'lecturer') {
      const [rows] = await ctx.pool.query(`
        SELECT a.id, a.title, a.description, a.rubric, a.due_date, a.is_group_work, a.created_at,
               COALESCE(g.group_count, 0)              AS group_count,
               COALESCE(g.submitted_group_count, 0)    AS submitted_group_count,
               COALESCE(g.flagged_group_count, 0)      AS flagged_group_count,
               COALESCE(s.submitted_count, 0)          AS submitted_count
        FROM assignments a
        LEFT JOIN (
          SELECT g.assignment_id,
                 COUNT(*)                                            AS group_count,
                 COUNT(CASE WHEN g.frozen_at IS NOT NULL THEN 1 END) AS submitted_group_count,
                 COUNT(CASE WHEN g.frozen_at IS NOT NULL AND (
                     EXISTS (
                       SELECT 1
                       FROM group_members gm
                       LEFT JOIN group_member_status gms
                         ON gms.group_id = gm.group_id AND gms.student_id = gm.student_id
                       WHERE gm.group_id = g.id AND COALESCE(gms.status, 'not_started') != 'done'
                     )
                     OR EXISTS (
                       SELECT 1 FROM submissions os
                       WHERE os.group_id = g.id AND os.status = 'submitted' AND os.override_used = 1
                     )
                 ) THEN 1 END)                                       AS flagged_group_count
          FROM \`groups\` g
          GROUP BY g.assignment_id
        ) g ON g.assignment_id = a.id
        LEFT JOIN (
          SELECT assignment_id, COUNT(*) AS submitted_count
          FROM submissions
          WHERE status = 'submitted' AND group_id IS NULL
          GROUP BY assignment_id
        ) s ON s.assignment_id = a.id
        WHERE a.lecturer_id = ?
        ORDER BY a.created_at DESC
      `, [user.sub]);
      return sendJson(ctx, 200, { assignments: rows });
    }
    const [rows] = await ctx.pool.query(`
      SELECT a.id, a.title, a.description, a.rubric, a.due_date, a.is_group_work, a.created_at,
             s.id AS submission_id, s.status AS submission_status
      FROM assignments a
      LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
      ORDER BY a.created_at DESC
    `, [user.sub]);
    return sendJson(ctx, 200, { assignments: rows });
  }

  if (ctx.req.method === 'POST') {
    const u = guardRole(ctx, 'lecturer');
    if (!u) return;
    const data = ctx.body;
    if (missingField(data, 'title')) return sendError(ctx, 422, 'Missing required field: title');

    const [r] = await ctx.pool.query(
      'INSERT INTO assignments (lecturer_id, title, description, rubric, due_date, is_group_work) VALUES (?, ?, ?, ?, ?, ?)',
      [
        u.sub,
        data.title,
        data.description ?? null,
        data.rubric !== undefined ? JSON.stringify(data.rubric) : null,
        data.due_date ?? null,
        data.is_group_work ? 1 : 0,
      ],
    );
    const id = r.insertId;
    const [rows] = await ctx.pool.query(
      'SELECT id, title, description, rubric, due_date, created_at FROM assignments WHERE id = ?',
      [id],
    );
    return sendJson(ctx, 201, { assignment: rows[0] });
  }

  sendError(ctx, 405, 'Method not allowed');
}