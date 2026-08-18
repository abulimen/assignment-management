import bcrypt from 'bcrypt';
import { sendJson, sendError, guard, missingField, parseIdParam } from '../http.js';

// GET /api/courses/:id, PUT /api/courses/:id, DELETE /api/courses/:id
export default async function course(ctx) {
  const user = guard(ctx);
  if (!user) return;

  const numericId = parseIdParam(ctx, 'Invalid course ID');
  if (!numericId) return;

  // Verify membership
  const [membership] = await ctx.pool.query(
    'SELECT role FROM course_members WHERE course_id = ? AND user_id = ?',
    [numericId, user.sub],
  );
  if (membership.length === 0) {
    return sendError(ctx, 403, 'You are not a member of this course');
  }
  const userRole = membership[0].role;

  if (ctx.req.method === 'GET') {
    const [cRows] = await ctx.pool.query(
      `SELECT c.id, c.organization_id, c.code, c.title, c.description, c.semester, c.invite_code, c.created_by, c.created_at,
              o.name AS organization_name
       FROM courses c
       LEFT JOIN organizations o ON o.id = c.organization_id
       WHERE c.id = ?`,
      [numericId],
    );
    if (cRows.length === 0) return sendError(ctx, 404, 'Course not found');
    const courseObj = cRows[0];

    // Fetch assignments in this course
    let assignments = [];
    if (userRole === 'lecturer') {
      const [aRows] = await ctx.pool.query(`
        SELECT a.id, a.course_id, a.lecturer_id, a.title, a.description, a.rubric, a.due_date, 
               a.is_group_work, a.target_type, a.created_at,
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
        WHERE a.course_id = ?
        ORDER BY a.created_at DESC
      `, [numericId]);
      assignments = aRows;
    } else {
      // Student view: only eligible assignments
      const [aRows] = await ctx.pool.query(`
        SELECT a.id, a.course_id, a.lecturer_id, a.title, a.description, a.rubric, a.due_date, 
               a.is_group_work, a.target_type, a.created_at,
               s.id AS submission_id, s.status AS submission_status
        FROM assignments a
        LEFT JOIN assignment_participants ap ON ap.assignment_id = a.id AND ap.user_id = ?
        LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
        WHERE a.course_id = ?
          AND (a.target_type = 'all' OR ap.user_id IS NOT NULL)
        ORDER BY a.created_at DESC
      `, [user.sub, user.sub, numericId]);
      assignments = aRows;
    }

    // Fetch members
    const [mRows] = await ctx.pool.query(`
      SELECT cm.user_id, cm.role, cm.joined_at, u.name, u.email, u.student_id
      FROM course_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.course_id = ?
      ORDER BY cm.role DESC, u.name ASC
    `, [numericId]);

    return sendJson(ctx, 200, {
      course: {
        ...courseObj,
        user_role: userRole,
        student_count: mRows.filter((m) => m.role === 'student').length,
        lecturer_count: mRows.filter((m) => m.role === 'lecturer').length,
      },
      assignments,
      members: mRows,
    });
  }

  if (ctx.req.method === 'PUT') {
    if (userRole !== 'lecturer') return sendError(ctx, 403, 'Only course lecturers can edit the course');
    const data = ctx.body;
    await ctx.pool.query(
      `UPDATE courses 
       SET title = COALESCE(?, title),
           code = COALESCE(?, code),
           description = COALESCE(?, description),
           semester = COALESCE(?, semester)
       WHERE id = ?`,
      [
        data.title ? data.title.trim() : null,
        data.code ? data.code.trim().toUpperCase() : null,
        data.description !== undefined ? data.description : null,
        data.semester !== undefined ? data.semester : null,
        numericId,
      ],
    );
    const [updated] = await ctx.pool.query('SELECT * FROM courses WHERE id = ?', [numericId]);
    return sendJson(ctx, 200, { course: updated[0] });
  }

  if (ctx.req.method === 'DELETE') {
    if (userRole !== 'lecturer') return sendError(ctx, 403, 'Only course lecturers can delete the course');
    const data = ctx.body || {};
    if (!data.password) {
      return sendError(ctx, 422, 'Password confirmation is required to delete this course');
    }
    const [userRows] = await ctx.pool.query('SELECT password FROM users WHERE id = ?', [user.sub]);
    if (userRows.length === 0) return sendError(ctx, 404, 'User not found');
    const valid = await bcrypt.compare(data.password, userRows[0].password);
    if (!valid) {
      return sendError(ctx, 401, 'Incorrect password. Deletion cancelled.');
    }
    await ctx.pool.query('DELETE FROM courses WHERE id = ?', [numericId]);
    return sendJson(ctx, 200, { message: 'Course deleted successfully' });
  }

  sendError(ctx, 405, 'Method not allowed');
}
