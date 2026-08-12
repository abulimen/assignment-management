import { sendJson, sendError, guard, missingField } from '../http.js';

// POST /api/submissions — create a draft submission (student only).
export default async function submissions(ctx) {
  const user = guard(ctx);
  if (!user) return;
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