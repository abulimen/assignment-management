import { sendJson, sendError, guard, guardRole, missingField } from '../http.js';
import crypto from 'node:crypto';

function generateCourseInviteCode(code) {
  const sanitized = (code || 'COURSE').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'CRS';
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `${sanitized}-${suffix}`;
}

// GET /api/courses (list user's courses) and POST /api/courses (create course).
export default async function courses(ctx) {
  const user = guard(ctx);
  if (!user) return;

  if (ctx.req.method === 'GET') {
    if (user.role === 'lecturer') {
      const [rows] = await ctx.pool.query(`
        SELECT c.id, c.organization_id, c.code, c.title, c.description, c.semester, c.invite_code, c.created_by, c.created_at,
               COUNT(DISTINCT cm_stud.user_id) AS student_count,
               COUNT(DISTINCT a.id)            AS assignment_count
        FROM courses c
        JOIN course_members cm ON cm.course_id = c.id AND cm.user_id = ? AND cm.role = 'lecturer'
        LEFT JOIN course_members cm_stud ON cm_stud.course_id = c.id AND cm_stud.role = 'student'
        LEFT JOIN assignments a ON a.course_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `, [user.sub]);
      return sendJson(ctx, 200, { courses: rows });
    }

    // Student role
    const [rows] = await ctx.pool.query(`
      SELECT c.id, c.organization_id, c.code, c.title, c.description, c.semester, c.invite_code, c.created_by, c.created_at,
             COUNT(DISTINCT a.id) AS assignment_count,
             COUNT(DISTINCT CASE 
               WHEN (a.target_type = 'all' OR ap.user_id IS NOT NULL) 
                AND (s.id IS NULL OR s.status = 'draft') 
               THEN a.id 
             END) AS pending_assignment_count
      FROM courses c
      JOIN course_members cm ON cm.course_id = c.id AND cm.user_id = ? AND cm.role = 'student'
      LEFT JOIN assignments a ON a.course_id = c.id
      LEFT JOIN assignment_participants ap ON ap.assignment_id = a.id AND ap.user_id = ?
      LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [user.sub, user.sub, user.sub]);
    return sendJson(ctx, 200, { courses: rows });
  }

  if (ctx.req.method === 'POST') {
    const u = guardRole(ctx, 'lecturer');
    if (!u) return;
    const data = ctx.body;
    if (missingField(data, 'title')) return sendError(ctx, 422, 'Missing required field: title');
    if (missingField(data, 'code')) return sendError(ctx, 422, 'Missing required field: code');

    // Get or assign organization_id for user
    const [userRows] = await ctx.pool.query('SELECT organization_id FROM users WHERE id = ?', [u.sub]);
    let orgId = userRows[0]?.organization_id;
    if (!orgId) {
      // Find or seed default organization
      const [orgRows] = await ctx.pool.query('SELECT id FROM organizations LIMIT 1');
      if (orgRows.length > 0) {
        orgId = orgRows[0].id;
      } else {
        const [newOrg] = await ctx.pool.query('INSERT INTO organizations (name) VALUES (?)', ['Draftly Beta University']);
        orgId = newOrg.insertId;
      }
      await ctx.pool.query('UPDATE users SET organization_id = ? WHERE id = ?', [orgId, u.sub]);
    }

    // Generate unique invite code
    let inviteCode = generateCourseInviteCode(data.code);
    let attempts = 0;
    while (attempts < 5) {
      const [existing] = await ctx.pool.query('SELECT id FROM courses WHERE invite_code = ?', [inviteCode]);
      if (existing.length === 0) break;
      inviteCode = generateCourseInviteCode(data.code);
      attempts++;
    }

    const [r] = await ctx.pool.query(
      `INSERT INTO courses (organization_id, code, title, description, semester, invite_code, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        orgId,
        data.code.trim().toUpperCase(),
        data.title.trim(),
        data.description?.trim() ?? null,
        data.semester?.trim() ?? null,
        inviteCode,
        u.sub,
      ],
    );
    const courseId = r.insertId;

    // Automatically enroll creator as lecturer member
    await ctx.pool.query(
      'INSERT IGNORE INTO course_members (course_id, user_id, role) VALUES (?, ?, ?)',
      [courseId, u.sub, 'lecturer'],
    );

    const [created] = await ctx.pool.query(
      `SELECT id, organization_id, code, title, description, semester, invite_code, created_by, created_at
       FROM courses WHERE id = ?`,
      [courseId],
    );
    return sendJson(ctx, 201, { course: created[0] });
  }

  sendError(ctx, 405, 'Method not allowed');
}
