import { sendJson, sendError, guard, missingField } from '../http.js';

// POST /api/courses/join
export default async function joinCourse(ctx) {
  const user = guard(ctx);
  if (!user) return;

  if (ctx.req.method !== 'POST') return sendError(ctx, 405, 'Method not allowed');

  const { invite_code } = ctx.body;
  if (missingField({ invite_code }, 'invite_code')) {
    return sendError(ctx, 422, 'Missing required field: invite_code');
  }

  const normalizedCode = invite_code.trim().toUpperCase();

  // Find course
  const [courses] = await ctx.pool.query(
    'SELECT id, organization_id, code, title, description, semester, invite_code FROM courses WHERE UPPER(invite_code) = ?',
    [normalizedCode],
  );

  if (courses.length === 0) {
    return sendError(ctx, 404, 'Invalid course invite code');
  }

  const courseObj = courses[0];

  // Check existing membership
  const [existing] = await ctx.pool.query(
    'SELECT role FROM course_members WHERE course_id = ? AND user_id = ?',
    [courseObj.id, user.sub],
  );

  if (existing.length > 0) {
    return sendJson(ctx, 200, {
      course: courseObj,
      already_member: true,
      role: existing[0].role,
    });
  }

  // Enroll member with user's role
  const role = user.role === 'lecturer' ? 'lecturer' : 'student';
  await ctx.pool.query(
    'INSERT INTO course_members (course_id, user_id, role) VALUES (?, ?, ?)',
    [courseObj.id, user.sub, role],
  );

  return sendJson(ctx, 200, {
    course: courseObj,
    joined: true,
    role,
  });
}
