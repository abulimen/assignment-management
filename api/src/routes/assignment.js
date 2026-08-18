import { sendJson, sendError, guard, parseIdParam, parseDate } from '../http.js';
import { rosterForAssignment } from '../roster.js';

// GET/PUT/DELETE /api/assignments/:id
export default async function assignment(ctx) {
  const user = guard(ctx);
  if (!user) return;
  const id = parseIdParam(ctx, 'Assignment ID required');
  if (id === null) return;

  const [rows] = await ctx.pool.query(`
    SELECT a.id, a.course_id, a.lecturer_id, a.title, a.description, a.rubric, a.due_date, 
           a.is_group_work, a.target_type, a.created_at,
           c.code AS course_code, c.title AS course_title
    FROM assignments a
    LEFT JOIN courses c ON c.id = a.course_id
    WHERE a.id = ?
  `, [id]);
  const assignmentObj = rows[0];

  if (ctx.req.method === 'GET') {
    if (!assignmentObj) return sendError(ctx, 404, 'Assignment not found');

    // Check course membership
    let userRole = null;
    if (assignmentObj.course_id) {
      const [membership] = await ctx.pool.query(
        'SELECT role FROM course_members WHERE course_id = ? AND user_id = ?',
        [assignmentObj.course_id, user.sub],
      );
      if (membership.length > 0) userRole = membership[0].role;
    }

    if (user.role === 'lecturer') {
      // If lecturer belongs to the course or created the assignment:
      const isCourseLecturer = userRole === 'lecturer' || Number(assignmentObj.lecturer_id) === user.sub;
      if (!isCourseLecturer) {
        assignmentObj.submissions = [];
        assignmentObj.groups = [];
        return sendJson(ctx, 200, { assignment: assignmentObj });
      }

      const [subs] = await ctx.pool.query(`
        SELECT s.id, s.student_id, u.name AS student_name, u.email AS student_email,
               s.status, s.submitted_at, s.created_at, s.group_id,
               st.keystroke_count, st.paste_count, st.delete_count, st.avg_wpm, st.total_time_ms
        FROM submissions s
        JOIN users u ON u.id = s.student_id
        LEFT JOIN submission_stats st ON st.submission_id = s.id
        WHERE s.assignment_id = ?
          AND s.status = 'submitted'
          AND NOT EXISTS (SELECT 1 FROM group_sections gs WHERE gs.submission_id = s.id)
          AND (
            ? = 0
            OR s.group_id IS NOT NULL
            OR EXISTS (SELECT 1 FROM \`groups\` g WHERE g.merged_submission_id = s.id)
          )
        ORDER BY s.submitted_at DESC, s.created_at DESC
      `, [id, Number(assignmentObj.is_group_work)]);
      assignmentObj.submissions = subs;
      assignmentObj.groups = await rosterForAssignment(ctx.pool, id);
      return sendJson(ctx, 200, { assignment: assignmentObj });
    }

    // Student role
    if (assignmentObj.course_id && userRole !== 'student') {
      return sendError(ctx, 403, 'You do not have access to this assignment');
    }

    if (assignmentObj.target_type === 'selected') {
      const [isParticipant] = await ctx.pool.query(
        'SELECT 1 FROM assignment_participants WHERE assignment_id = ? AND user_id = ?',
        [id, user.sub],
      );
      if (isParticipant.length === 0) {
        return sendError(ctx, 403, 'You are not an assigned participant for this coursework');
      }
    }

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
    assignmentObj.submissions = subs;

    return sendJson(ctx, 200, { assignment: assignmentObj });
  }

  if (ctx.req.method === 'PUT') {
    if (user.role !== 'lecturer') return sendError(ctx, 403, 'Forbidden');
    if (!assignmentObj) return sendError(ctx, 404, 'Assignment not found');

    // Verify lecturer authorization
    const isOwner = Number(assignmentObj.lecturer_id) === user.sub;
    let isCourseLecturer = isOwner;
    if (!isCourseLecturer && assignmentObj.course_id) {
      const [cm] = await ctx.pool.query(
        "SELECT 1 FROM course_members WHERE course_id = ? AND user_id = ? AND role = 'lecturer'",
        [assignmentObj.course_id, user.sub],
      );
      isCourseLecturer = cm.length > 0;
    }
    if (!isCourseLecturer) return sendError(ctx, 403, 'Forbidden');

    const data = ctx.body;
    const fields = [];
    const values = [];
    for (const f of ['title', 'description', 'target_type']) {
      if (data[f] !== undefined) { fields.push(`${f} = ?`); values.push(data[f]); }
    }
    if (data.due_date !== undefined) {
      fields.push('due_date = ?');
      values.push(parseDate(data.due_date));
    }
    if (data.rubric !== undefined) { fields.push('rubric = ?'); values.push(JSON.stringify(data.rubric)); }
    if ('is_group_work' in data) { fields.push('is_group_work = ?'); values.push(data.is_group_work ? 1 : 0); }
    if (fields.length === 0) return sendError(ctx, 422, 'No fields to update');

    values.push(id);
    await ctx.pool.query(`UPDATE assignments SET ${fields.join(', ')} WHERE id = ?`, values);

    // If updating selected student participants
    if (data.target_type === 'selected' && Array.isArray(data.student_ids)) {
      await ctx.pool.query('DELETE FROM assignment_participants WHERE assignment_id = ?', [id]);
      for (const sId of data.student_ids) {
        const numSId = parseInt(sId, 10);
        if (!isNaN(numSId)) {
          await ctx.pool.query(
            'INSERT IGNORE INTO assignment_participants (assignment_id, user_id) VALUES (?, ?)',
            [id, numSId],
          );
        }
      }
    }

    const [rows2] = await ctx.pool.query(
      'SELECT id, title, description, rubric, due_date, created_at FROM assignments WHERE id = ?',
      [id],
    );
    return sendJson(ctx, 200, { assignment: rows2[0] });
  }

  if (ctx.req.method === 'DELETE') {
    if (user.role !== 'lecturer') return sendError(ctx, 403, 'Forbidden');
    if (!assignmentObj) return sendError(ctx, 404, 'Assignment not found');

    const isOwner = Number(assignmentObj.lecturer_id) === user.sub;
    let isCourseLecturer = isOwner;
    if (!isCourseLecturer && assignmentObj.course_id) {
      const [cm] = await ctx.pool.query(
        "SELECT 1 FROM course_members WHERE course_id = ? AND user_id = ? AND role = 'lecturer'",
        [assignmentObj.course_id, user.sub],
      );
      isCourseLecturer = cm.length > 0;
    }
    if (!isCourseLecturer) return sendError(ctx, 403, 'Forbidden');

    await ctx.pool.query('DELETE FROM assignments WHERE id = ?', [id]);
    return sendJson(ctx, 200, { ok: true });
  }

  sendError(ctx, 405, 'Method not allowed');
}