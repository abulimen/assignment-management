import { sendJson, sendError, guard, missingField, parseIdParam } from '../http.js';

// GET /api/courses/:id/members, POST /api/courses/:id/members, DELETE /api/courses/:id/members/:userId
export default async function courseMembers(ctx) {
  const user = guard(ctx);
  if (!user) return;

  const numericCourseId = parseIdParam(ctx, 'Invalid course ID');
  if (!numericCourseId) return;

  const memberUserId = ctx.params.userId;

  // Verify requester membership
  const [membership] = await ctx.pool.query(
    'SELECT role FROM course_members WHERE course_id = ? AND user_id = ?',
    [numericCourseId, user.sub],
  );
  if (membership.length === 0) {
    return sendError(ctx, 403, 'You are not a member of this course');
  }
  const requesterRole = membership[0].role;

  if (ctx.req.method === 'GET') {
    const [rows] = await ctx.pool.query(`
      SELECT cm.user_id, cm.role, cm.joined_at, u.name, u.email
      FROM course_members cm
      JOIN users u ON u.id = cm.user_id
      WHERE cm.course_id = ?
      ORDER BY cm.role DESC, u.name ASC
    `, [numericCourseId]);
    return sendJson(ctx, 200, { members: rows });
  }

  if (ctx.req.method === 'POST') {
    if (requesterRole !== 'lecturer') return sendError(ctx, 403, 'Only lecturers can add members directly');
    const { email, role = 'student' } = ctx.body;
    if (missingField({ email }, 'email')) return sendError(ctx, 422, 'Missing required field: email');

    // Find user by email
    const [targetUsers] = await ctx.pool.query('SELECT id, name, email FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (targetUsers.length === 0) {
      return sendError(ctx, 404, 'User with that email does not exist in Draftly');
    }
    const targetUser = targetUsers[0];

    const memberRole = role === 'lecturer' ? 'lecturer' : 'student';
    await ctx.pool.query(
      'INSERT INTO course_members (course_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = ?',
      [numericCourseId, targetUser.id, memberRole, memberRole],
    );

    return sendJson(ctx, 200, {
      message: 'Member added successfully',
      member: {
        user_id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: memberRole,
      },
    });
  }

  if (ctx.req.method === 'DELETE') {
    if (requesterRole !== 'lecturer') return sendError(ctx, 403, 'Only lecturers can remove members');
    const targetId = parseInt(memberUserId, 10);
    if (isNaN(targetId)) return sendError(ctx, 400, 'Invalid user ID to remove');

    // Prevent removing oneself if they are the only lecturer
    if (targetId === user.sub) {
      const [lecturers] = await ctx.pool.query(
        "SELECT user_id FROM course_members WHERE course_id = ? AND role = 'lecturer'",
        [numericCourseId],
      );
      if (lecturers.length <= 1) {
        return sendError(ctx, 400, 'Cannot remove the only lecturer from the course');
      }
    }

    await ctx.pool.query(
      'DELETE FROM course_members WHERE course_id = ? AND user_id = ?',
      [numericCourseId, targetId],
    );

    return sendJson(ctx, 200, { message: 'Member removed from course' });
  }

  sendError(ctx, 405, 'Method not allowed');
}
