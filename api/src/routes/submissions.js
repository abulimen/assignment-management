import { sendJson, sendError, guard, missingField } from '../http.js';

const LIST_SELECT = `
  SELECT s.id, s.student_id, u.name AS student_name, s.status, s.submitted_at, s.created_at,
         st.keystroke_count, st.paste_count, st.delete_count, st.avg_wpm, st.total_time_ms
  FROM submissions s
  JOIN users u ON u.id = s.student_id
  LEFT JOIN submission_stats st ON st.submission_id = s.id
`;

// GET /api/submissions?assignment_id= / POST /api/submissions
export default async function submissions(ctx) {
  const user = guard(ctx);
  if (!user) return;

  if (ctx.req.method === 'GET') {
    const url = new URL(ctx.req.url, 'http://localhost');
    const assignmentId = parseInt(url.searchParams.get('assignment_id') || '', 10);
    if (!assignmentId) return sendError(ctx, 400, 'assignment_id required');

    if (user.role === 'lecturer') {
      const [aRows] = await ctx.pool.query('SELECT lecturer_id FROM assignments WHERE id = ?', [assignmentId]);
      const a = aRows[0];
      if (!a || Number(a.lecturer_id) !== user.sub) return sendError(ctx, 403, 'Forbidden');
      const [rows] = await ctx.pool.query(
        `${LIST_SELECT} WHERE s.assignment_id = ? ORDER BY s.created_at DESC`,
        [assignmentId],
      );
      return sendJson(ctx, 200, { submissions: rows });
    }

    const [rows] = await ctx.pool.query(
      `${LIST_SELECT} WHERE s.assignment_id = ? AND s.student_id = ? ORDER BY s.created_at DESC`,
      [assignmentId, user.sub],
    );
    return sendJson(ctx, 200, { submissions: rows });
  }

  if (ctx.req.method !== 'POST') return sendError(ctx, 405, 'Method not allowed');
  if (user.role !== 'student') return sendError(ctx, 403, 'Only students can submit');

  const data = ctx.body;
  if (missingField(data, 'assignment_id')) return sendError(ctx, 422, 'Missing required field: assignment_id');

  const [aRows] = await ctx.pool.query('SELECT id FROM assignments WHERE id = ?', [data.assignment_id]);
  if (!aRows.length) return sendError(ctx, 404, 'Assignment not found');

  const [r] = await ctx.pool.query(
    'INSERT INTO submissions (assignment_id, student_id, content, status) VALUES (?, ?, ?, ?)',
    [data.assignment_id, user.sub, data.content ?? null, 'draft'],
  );
  const id = r.insertId;

  await ctx.pool.query('INSERT INTO submission_stats (submission_id) VALUES (?)', [id]);

  const [rows] = await ctx.pool.query(
    'SELECT id, assignment_id, student_id, status, submitted_at, created_at FROM submissions WHERE id = ?',
    [id],
  );
  sendJson(ctx, 201, { submission: rows[0] });
}