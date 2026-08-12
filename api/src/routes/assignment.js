import { sendJson, sendError, guard, parseIdParam } from '../http.js';
import { rosterForAssignment } from '../roster.js';

// GET/PUT/DELETE /api/assignments/:id
export default async function assignment(ctx) {
  const user = guard(ctx);
  if (!user) return;
  const id = parseIdParam(ctx, 'Assignment ID required');
  if (id === null) return;

  if (ctx.req.method === 'GET') {
    const [rows] = await ctx.pool.query(
      'SELECT id, lecturer_id, title, description, rubric, due_date, is_group_work, created_at FROM assignments WHERE id = ?',
      [id],
    );
    const assignment = rows[0];
    if (!assignment) return sendError(ctx, 404, 'Assignment not found');

    if (user.role === 'lecturer') {
      if (Number(assignment.lecturer_id) !== user.sub) {
        assignment.submissions = [];
      } else {
        const [subs] = await ctx.pool.query(`
          SELECT s.id, s.student_id, u.name AS student_name, u.email AS student_email,
                 s.status, s.submitted_at, s.created_at, s.group_id,
                 st.keystroke_count, st.paste_count, st.delete_count, st.avg_wpm, st.total_time_ms
          FROM submissions s
          JOIN users u ON u.id = s.student_id
          LEFT JOIN submission_stats st ON st.submission_id = s.id
          WHERE s.assignment_id = ?
            AND NOT EXISTS (SELECT 1 FROM group_sections gs WHERE gs.submission_id = s.id)
            AND (
              ? = 0
              OR s.group_id IS NOT NULL
              OR EXISTS (SELECT 1 FROM \`groups\` g WHERE g.merged_submission_id = s.id)
            )
          ORDER BY s.created_at DESC
        `, [id, Number(assignment.is_group_work)]);
        assignment.submissions = subs;
        assignment.groups = await rosterForAssignment(ctx.pool, id);
      }
    } else {
      const [subs] = await ctx.pool.query(`
        SELECT s.id, s.student_id, u.name AS student_name, u.email AS student_email,
               s.status, s.submitted_at, s.created_at,
               st.keystroke_count, st.paste_count, st.delete_count, st.avg_wpm, st.total_time_ms
        FROM submissions s
        JOIN users u ON u.id = s.student_id
        LEFT JOIN submission_stats st ON st.submission_id = s.id
        WHERE s.assignment_id = ? AND s.student_id = ?
        ORDER BY s.created_at DESC
      `, [id, user.sub]);
      assignment.submissions = subs;
    }

    return sendJson(ctx, 200, { assignment });
  }

  if (ctx.req.method === 'PUT') {
    if (user.role !== 'lecturer') return sendError(ctx, 403, 'Forbidden');
    const data = ctx.body;

    const [aRows] = await ctx.pool.query('SELECT lecturer_id FROM assignments WHERE id = ?', [id]);
    const a = aRows[0];
    if (!a) return sendError(ctx, 404, 'Assignment not found');
    if (Number(a.lecturer_id) !== user.sub) return sendError(ctx, 403, 'Forbidden');

    const fields = [];
    const values = [];
    for (const f of ['title', 'description', 'due_date']) {
      if (data[f] !== undefined) { fields.push(`${f} = ?`); values.push(data[f]); }
    }
    if (data.rubric !== undefined) { fields.push('rubric = ?'); values.push(JSON.stringify(data.rubric)); }
    if ('is_group_work' in data) { fields.push('is_group_work = ?'); values.push(data.is_group_work ? 1 : 0); }
    if (fields.length === 0) return sendError(ctx, 422, 'No fields to update');

    values.push(id);
    await ctx.pool.query(`UPDATE assignments SET ${fields.join(', ')} WHERE id = ?`, values);

    const [rows2] = await ctx.pool.query(
      'SELECT id, title, description, rubric, due_date, created_at FROM assignments WHERE id = ?',
      [id],
    );
    return sendJson(ctx, 200, { assignment: rows2[0] });
  }

  if (ctx.req.method === 'DELETE') {
    if (user.role !== 'lecturer') return sendError(ctx, 403, 'Forbidden');

    const [aRows] = await ctx.pool.query('SELECT lecturer_id FROM assignments WHERE id = ?', [id]);
    const a = aRows[0];
    if (!a) return sendError(ctx, 404, 'Assignment not found');
    if (Number(a.lecturer_id) !== user.sub) return sendError(ctx, 403, 'Forbidden');

    await ctx.pool.query('DELETE FROM assignments WHERE id = ?', [id]);
    return sendJson(ctx, 200, { ok: true });
  }

  sendError(ctx, 405, 'Method not allowed');
}