import { sendJson, sendError, guard, guardRole, missingField, parseDate } from '../http.js';
import { decodeId } from '@am/core';

// GET /api/assignments (list) and POST /api/assignments (create).
export default async function assignments(ctx) {
  const user = guard(ctx);
  if (!user) return;

  const url = new URL(ctx.req.url, 'http://localhost');
  const courseFilterRaw = url.searchParams.get('course_id');
  const courseFilter = courseFilterRaw ? decodeId(courseFilterRaw) : null;

  if (ctx.req.method === 'GET') {
    if (user.role === 'lecturer') {
      let query = `
        SELECT a.id, a.course_id, a.title, a.description, a.rubric, a.due_date, a.is_group_work, a.target_type, a.created_at,
               c.code AS course_code, c.title AS course_title,
               COALESCE(g.group_count, 0)              AS group_count,
               COALESCE(g.submitted_group_count, 0)    AS submitted_group_count,
               COALESCE(g.flagged_group_count, 0)      AS flagged_group_count,
               COALESCE(s.submitted_count, 0)          AS submitted_count
        FROM assignments a
        JOIN courses c ON c.id = a.course_id
        JOIN course_members cm ON cm.course_id = c.id AND cm.user_id = ? AND cm.role = 'lecturer'
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
      `;
      const params = [user.sub];

      if (courseFilter) {
        query += ' WHERE a.course_id = ?';
        params.push(courseFilter);
      }

      query += ' ORDER BY a.created_at DESC';

      const [rows] = await ctx.pool.query(query, params);
      return sendJson(ctx, 200, { assignments: rows });
    }

    // Student role: strictly filter to user's enrolled courses and eligible assignments
    let query = `
      SELECT a.id, a.course_id, a.title, a.description, a.rubric, a.due_date, a.is_group_work, a.target_type, a.created_at,
             c.code AS course_code, c.title AS course_title,
             s.id AS submission_id, s.status AS submission_status
      FROM assignments a
      JOIN courses c ON c.id = a.course_id
      JOIN course_members cm ON cm.course_id = c.id AND cm.user_id = ? AND cm.role = 'student'
      LEFT JOIN assignment_participants ap ON ap.assignment_id = a.id AND ap.user_id = ?
      LEFT JOIN (
        SELECT s1.id, s1.assignment_id, s1.student_id, s1.status
        FROM submissions s1
        INNER JOIN (
          SELECT assignment_id, student_id, MAX(CASE WHEN status = 'submitted' THEN id + 1000000000 ELSE id END) AS max_key
          FROM submissions
          GROUP BY assignment_id, student_id
        ) s2 ON (CASE WHEN s1.status = 'submitted' THEN s1.id + 1000000000 ELSE s1.id END) = s2.max_key
      ) s ON s.assignment_id = a.id AND s.student_id = ?
      WHERE (a.target_type = 'all' OR ap.user_id IS NOT NULL)
    `;
    const params = [user.sub, user.sub, user.sub];

    if (courseFilter) {
      query += ' AND a.course_id = ?';
      params.push(courseFilter);
    }

    query += ' ORDER BY a.created_at DESC';

    const [rows] = await ctx.pool.query(query, params);
    return sendJson(ctx, 200, { assignments: rows });
  }

  if (ctx.req.method === 'POST') {
    const u = guardRole(ctx, 'lecturer');
    if (!u) return;
    const data = ctx.body;
    if (missingField(data, 'title')) return sendError(ctx, 422, 'Missing required field: title');

    // Support single course_id, additional_course_ids, or multiple target_courses array
    let courseIds = [];
    if (Array.isArray(data.target_courses) && data.target_courses.length > 0) {
      courseIds = data.target_courses.map((id) => decodeId(id)).filter((id) => id !== null);
    } else if (data.course_id) {
      const parsed = decodeId(data.course_id);
      if (parsed) courseIds = [parsed];
      if (Array.isArray(data.additional_course_ids)) {
        for (const addId of data.additional_course_ids) {
          const parsedAdd = decodeId(addId);
          if (parsedAdd && !courseIds.includes(parsedAdd)) {
            courseIds.push(parsedAdd);
          }
        }
      }
    }

    // Fallback: If no course specified, find or create the lecturer's default course
    if (courseIds.length === 0) {
      const [lecturerCourses] = await ctx.pool.query(
        "SELECT course_id FROM course_members WHERE user_id = ? AND role = 'lecturer' LIMIT 1",
        [u.sub],
      );
      if (lecturerCourses.length > 0) {
        courseIds = [lecturerCourses[0].course_id];
      } else {
        // Create default course for lecturer
        const [org] = await ctx.pool.query('SELECT id FROM organizations LIMIT 1');
        const orgId = org[0]?.id || 1;
        const [newCourse] = await ctx.pool.query(
          'INSERT INTO courses (organization_id, code, title, invite_code, created_by) VALUES (?, ?, ?, ?, ?)',
          [orgId, 'GEN 101', 'General Coursework', `GEN-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, u.sub],
        );
        const newCourseId = newCourse.insertId;
        await ctx.pool.query(
          'INSERT INTO course_members (course_id, user_id, role) VALUES (?, ?, ?)',
          [newCourseId, u.sub, 'lecturer'],
        );
        await ctx.pool.query(
          "INSERT IGNORE INTO course_members (course_id, user_id, role) SELECT ?, id, 'student' FROM users WHERE role = 'student'",
          [newCourseId],
        );
        courseIds = [newCourseId];
      }
    }

    // Verify lecturer is a lecturer in all target courses
    for (const cId of courseIds) {
      const [m] = await ctx.pool.query(
        "SELECT 1 FROM course_members WHERE course_id = ? AND user_id = ? AND role = 'lecturer'",
        [cId, u.sub],
      );
      if (m.length === 0) {
        return sendError(ctx, 403, `You are not authorized to create assignments in course ${cId}`);
      }
    }

    const createdAssignments = [];
    const targetType = data.target_type === 'selected' ? 'selected' : 'all';
    const formattedDueDate = parseDate(data.due_date);

    for (const cId of courseIds) {
      const [r] = await ctx.pool.query(
        `INSERT INTO assignments (course_id, lecturer_id, title, description, rubric, due_date, is_group_work, target_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cId,
          u.sub,
          data.title.trim(),
          data.description ?? null,
          data.rubric !== undefined ? (typeof data.rubric === 'string' ? data.rubric : JSON.stringify(data.rubric)) : null,
          formattedDueDate,
          data.is_group_work ? 1 : 0,
          targetType,
        ],
      );
      const id = r.insertId;

      // If targeted students provided, insert into assignment_participants
      if (targetType === 'selected' && Array.isArray(data.student_ids) && data.student_ids.length > 0) {
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

      const [rows] = await ctx.pool.query(
        'SELECT id, title, description, rubric, due_date, created_at FROM assignments WHERE id = ?',
        [id],
      );
      createdAssignments.push(rows[0]);
    }

    return sendJson(ctx, 201, {
      assignment: createdAssignments[0],
      assignments: createdAssignments,
    });
  }

  sendError(ctx, 405, 'Method not allowed');
}