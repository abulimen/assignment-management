import { sendJson, sendError, guardRole, missingField, parseDate, parseIdParam } from '../http.js';
import { decodeId } from '@am/core';

// POST /api/assignments/:id/duplicate
export default async function duplicateAssignment(ctx) {
  const u = guardRole(ctx, 'lecturer');
  if (!u) return;

  if (ctx.req.method !== 'POST') return sendError(ctx, 405, 'Method not allowed');

  const numericId = parseIdParam(ctx, 'Invalid assignment ID');
  if (!numericId) return;

  const { target_course_id, title, due_date } = ctx.body;
  if (missingField({ target_course_id }, 'target_course_id')) {
    return sendError(ctx, 422, 'Missing required field: target_course_id');
  }

  const numericTargetCourseId = decodeId(target_course_id);
  if (!numericTargetCourseId) return sendError(ctx, 400, 'Invalid target course ID');

  // Verify lecturer access to source assignment
  const [sourceRows] = await ctx.pool.query(
    `SELECT a.* FROM assignments a
     JOIN course_members cm ON cm.course_id = a.course_id AND cm.user_id = ? AND cm.role = 'lecturer'
     WHERE a.id = ?`,
    [u.sub, numericId],
  );
  if (sourceRows.length === 0) {
    return sendError(ctx, 403, 'Source assignment not found or you do not have permission to duplicate it');
  }
  const source = sourceRows[0];

  // Verify lecturer access to target course
  const [targetMembers] = await ctx.pool.query(
    "SELECT role FROM course_members WHERE course_id = ? AND user_id = ? AND role = 'lecturer'",
    [numericTargetCourseId, u.sub],
  );
  if (targetMembers.length === 0) {
    return sendError(ctx, 403, 'You are not a lecturer of the target course');
  }

  // Create new independent assignment in target course
  const [r] = await ctx.pool.query(
    `INSERT INTO assignments (course_id, lecturer_id, title, description, rubric, due_date, is_group_work, target_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      numericTargetCourseId,
      u.sub,
      title?.trim() || source.title,
      source.description,
      source.rubric ? (typeof source.rubric === 'string' ? source.rubric : JSON.stringify(source.rubric)) : null,
      due_date !== undefined ? parseDate(due_date) : source.due_date,
      source.is_group_work ? 1 : 0,
      source.target_type || 'all',
    ],
  );

  const newId = r.insertId;
  const [newAssignment] = await ctx.pool.query(
    'SELECT * FROM assignments WHERE id = ?',
    [newId],
  );

  return sendJson(ctx, 201, { assignment: newAssignment[0] });
}
