import { sendJson, sendError, guard, missingField } from '../http.js';
import { decodeId } from '@am/core';

const LIST_SELECT = `
  SELECT s.id, s.student_id, u.name AS student_name, u.student_id AS student_matric, s.status, s.submitted_at, s.created_at,
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
    const rawAssignmentId = url.searchParams.get('assignment_id') || '';
    const assignmentId = decodeId(rawAssignmentId);
    if (!assignmentId) return sendError(ctx, 400, 'assignment_id required');

    const [aRows] = await ctx.pool.query('SELECT id, course_id, target_type FROM assignments WHERE id = ?', [assignmentId]);
    const a = aRows[0];
    if (!a) return sendError(ctx, 404, 'Assignment not found');

    // Verify course membership
    const [membership] = await ctx.pool.query(
      'SELECT role FROM course_members WHERE course_id = ? AND user_id = ?',
      [a.course_id, user.sub],
    );
    if (membership.length === 0) return sendError(ctx, 403, 'Forbidden');
    const userRole = membership[0].role;

    if (userRole === 'lecturer') {
      const [rows] = await ctx.pool.query(
        `${LIST_SELECT} WHERE s.assignment_id = ? AND s.status = 'submitted' ORDER BY s.submitted_at DESC, s.created_at DESC`,
        [assignmentId],
      );
      return sendJson(ctx, 200, { submissions: rows });
    }

    // Student view
    if (a.target_type === 'selected') {
      const [isPart] = await ctx.pool.query(
        'SELECT 1 FROM assignment_participants WHERE assignment_id = ? AND user_id = ?',
        [assignmentId, user.sub],
      );
      if (isPart.length === 0) return sendError(ctx, 403, 'Forbidden');
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

  const assignmentId = decodeId(data.assignment_id);
  if (!assignmentId) return sendError(ctx, 400, 'Invalid assignment_id');

  const [aRows] = await ctx.pool.query('SELECT id, course_id, target_type FROM assignments WHERE id = ?', [assignmentId]);
  if (!aRows.length) return sendError(ctx, 404, 'Assignment not found');
  const a = aRows[0];

  // Verify course membership and participant status
  const [membership] = await ctx.pool.query(
    "SELECT role FROM course_members WHERE course_id = ? AND user_id = ? AND role = 'student'",
    [a.course_id, user.sub],
  );
  if (membership.length === 0) return sendError(ctx, 403, 'You are not enrolled in the course for this assignment');

  if (a.target_type === 'selected') {
    const [isPart] = await ctx.pool.query(
      'SELECT 1 FROM assignment_participants WHERE assignment_id = ? AND user_id = ?',
      [assignmentId, user.sub],
    );
    if (isPart.length === 0) return sendError(ctx, 403, 'You are not an assigned participant for this coursework');
  }

  // If a draft or submission already exists for this student and assignment, return it
  const [existingRows] = await ctx.pool.query(
    'SELECT id, assignment_id, student_id, content, status, submitted_at, created_at FROM submissions WHERE assignment_id = ? AND student_id = ? ORDER BY created_at DESC',
    [assignmentId, user.sub],
  );
  if (existingRows.length > 0) {
    return sendJson(ctx, 200, { submission: existingRows[0] });
  }

  const [r] = await ctx.pool.query(
    'INSERT INTO submissions (assignment_id, student_id, content, status) VALUES (?, ?, ?, ?)',
    [assignmentId, user.sub, data.content ?? null, 'draft'],
  );
  const id = r.insertId;

  await ctx.pool.query('INSERT INTO submission_stats (submission_id) VALUES (?)', [id]);

  const [rows] = await ctx.pool.query(
    'SELECT id, assignment_id, student_id, content, status, submitted_at, created_at FROM submissions WHERE id = ?',
    [id],
  );
  sendJson(ctx, 201, { submission: rows[0] });
}