import { sendJson, sendError, guard, guardRole, missingField } from '../http.js';

// GET /api/assignments (list) and POST /api/assignments (create).
export default async function assignments(ctx) {
  const user = guard(ctx);
  if (!user) return;

  if (ctx.req.method === 'GET') {
    if (user.role === 'lecturer') {
      const [rows] = await ctx.pool.query(
        'SELECT id, title, description, rubric, due_date, is_group_work, created_at FROM assignments WHERE lecturer_id = ? ORDER BY created_at DESC',
        [user.sub],
      );
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