import bcrypt from 'bcrypt';
import { guard, sendJson, sendError } from '../http.js';

export default async function me(ctx) {
  const auth = guard(ctx);
  if (!auth) return;

  if (ctx.req.method === 'GET') {
    const [userRows] = await ctx.pool.query(
      'SELECT id, email, name, role, student_id, email_verified, created_at FROM users WHERE id = ?',
      [auth.sub],
    );
    const user = userRows[0];
    if (!user) return sendError(ctx, 404, 'User not found');

    // Fetch summary stats
    let courseCount = 0;
    let activityCount = 0;

    if (user.role === 'lecturer') {
      const [cRows] = await ctx.pool.query(
        'SELECT COUNT(DISTINCT course_id) AS cnt FROM course_members WHERE user_id = ? AND role = "lecturer"',
        [user.id],
      );
      courseCount = cRows[0]?.cnt || 0;

      const [aRows] = await ctx.pool.query(
        'SELECT COUNT(*) AS cnt FROM assignments WHERE lecturer_id = ?',
        [user.id],
      );
      activityCount = aRows[0]?.cnt || 0;
    } else {
      const [cRows] = await ctx.pool.query(
        'SELECT COUNT(DISTINCT course_id) AS cnt FROM course_members WHERE user_id = ? AND role = "student"',
        [user.id],
      );
      courseCount = cRows[0]?.cnt || 0;

      const [sRows] = await ctx.pool.query(
        'SELECT COUNT(*) AS cnt FROM submissions WHERE student_id = ? AND status = "submitted"',
        [user.id],
      );
      activityCount = sRows[0]?.cnt || 0;
    }

    return sendJson(ctx, 200, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.student_id || null,
        emailVerified: !!user.email_verified,
        createdAt: user.created_at,
        stats: {
          courses: courseCount,
          activities: activityCount,
        },
      },
    });
  }

  if (ctx.req.method === 'PUT') {
    const data = ctx.body || {};
    const [userRows] = await ctx.pool.query(
      'SELECT id, email, password, name, role, student_id, email_verified FROM users WHERE id = ?',
      [auth.sub],
    );
    const user = userRows[0];
    if (!user) return sendError(ctx, 404, 'User not found');

    const updates = [];
    const params = [];

    // Name update
    if (data.name !== undefined) {
      const trimmedName = String(data.name).trim();
      if (!trimmedName) return sendError(ctx, 422, 'Name cannot be empty');
      updates.push('name = ?');
      params.push(trimmedName);
    }

    // Student ID update (for students)
    if (data.studentId !== undefined) {
      const trimmedStudentId = String(data.studentId).trim();
      updates.push('student_id = ?');
      params.push(trimmedStudentId || null);
    }

    // Password change
    if (data.newPassword) {
      if (!data.currentPassword) {
        return sendError(ctx, 422, 'Current password is required to set a new password');
      }

      const match = await bcrypt.compare(String(data.currentPassword), user.password);
      if (!match) {
        return sendError(ctx, 401, 'Current password is incorrect');
      }

      const newPass = String(data.newPassword);
      if (newPass.length < 8) {
        return sendError(ctx, 422, 'New password must be at least 8 characters long');
      }

      const passwordHash = await bcrypt.hash(newPass, 12);
      updates.push('password = ?');
      params.push(passwordHash);
    }

    if (updates.length > 0) {
      params.push(user.id);
      await ctx.pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Return fresh user
    const [freshRows] = await ctx.pool.query(
      'SELECT id, email, name, role, student_id, email_verified, created_at FROM users WHERE id = ?',
      [user.id],
    );
    const fresh = freshRows[0];

    return sendJson(ctx, 200, {
      user: {
        id: fresh.id,
        email: fresh.email,
        name: fresh.name,
        role: fresh.role,
        studentId: fresh.student_id || null,
        emailVerified: !!fresh.email_verified,
        createdAt: fresh.created_at,
      },
      message: 'Profile updated successfully',
    });
  }

  return sendError(ctx, 405, 'Method not allowed');
}