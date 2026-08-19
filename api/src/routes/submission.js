import { sendJson, sendError, guard, parseIdParam } from '../http.js';
import { sectionPastedTexts } from '../authorship.js';
import { extractPlainText, strWordCount } from '../text.js';

const FULL_SUB_QUERY = `
  SELECT s.id, s.assignment_id, s.student_id, s.content, s.status, s.submitted_at, s.created_at,
         u.name AS student_name, u.email AS student_email,
         st.keystroke_count, st.paste_count, st.delete_count, st.cursor_jumps,
         st.avg_wpm, st.total_time_ms, st.active_time_ms, st.paste_ratio, st.word_count
  FROM submissions s
  JOIN users u ON u.id = s.student_id
  LEFT JOIN submission_stats st ON st.submission_id = s.id
  WHERE s.id = ?
`;

// GET /api/submissions/:id, POST /api/submissions/:id/submit, PUT /api/submissions/:id
export default async function submission(ctx) {
  const user = guard(ctx);
  if (!user) return;
  const id = parseIdParam(ctx, 'Submission ID required');
  if (id === null) return;

  const [rows] = await ctx.pool.query(FULL_SUB_QUERY, [id]);
  const sub = rows[0];

  if (ctx.req.method === 'GET') {
    if (!sub) return sendError(ctx, 404, 'Submission not found');

    if (user.role === 'student' && Number(sub.student_id) !== user.sub) {
      const [c] = await ctx.pool.query(`
        SELECT COUNT(*) AS c FROM group_members gm1
        JOIN group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.student_id = ? AND gm2.student_id = ?
      `, [user.sub, sub.student_id]);
      if (Number(c[0].c) === 0) return sendError(ctx, 403, 'Forbidden');
    }
    if (user.role === 'lecturer') {
      const [aRows] = await ctx.pool.query('SELECT course_id FROM assignments WHERE id = ?', [sub.assignment_id]);
      const a = aRows[0];
      if (!a) return sendError(ctx, 403, 'Forbidden');
      const [cm] = await ctx.pool.query(
        "SELECT 1 FROM course_members WHERE course_id = ? AND user_id = ? AND role = 'lecturer'",
        [a.course_id, user.sub],
      );
      if (cm.length === 0) return sendError(ctx, 403, 'Forbidden');
    }

    const [secRows] = await ctx.pool.query('SELECT merged FROM group_sections WHERE submission_id = ?', [id]);
    sub.section_merged = secRows.length ? Number(secRows[0].merged) === 1 : false;
    sub.pasted_texts = await sectionPastedTexts(ctx.pool, id);
    return sendJson(ctx, 200, { submission: sub });
  }

  // POST submit / PUT both need ownership + status of the target row.
  if (!sub) return sendError(ctx, 404, 'Submission not found');
  if (Number(sub.student_id) !== user.sub) return sendError(ctx, 403, 'Forbidden');

  if (ctx.req.method === 'POST') {
    if (sub.status === 'submitted') return sendError(ctx, 409, 'Already submitted');

    const content = ctx.body.content ?? null;
    await ctx.pool.query("UPDATE submissions SET status = 'submitted', submitted_at = NOW(), content = ? WHERE id = ?", [content, id]);

    if (content) {
      let doc = null;
      try { doc = JSON.parse(content); } catch { /* invalid JSON */ }
      if (doc) {
        const wordCount = strWordCount(extractPlainText(doc));
        await ctx.pool.query(
          'INSERT INTO submission_stats (submission_id, word_count) VALUES (?, ?) ON DUPLICATE KEY UPDATE word_count = VALUES(word_count)',
          [id, wordCount],
        );
      }
    }

    const [r2] = await ctx.pool.query(
      'SELECT id, assignment_id, student_id, status, submitted_at, created_at FROM submissions WHERE id = ?',
      [id],
    );
    return sendJson(ctx, 200, { submission: r2[0] });
  }

  if (ctx.req.method === 'PUT') {
    if (sub.status === 'submitted') return sendError(ctx, 409, 'Cannot edit submitted submission');
    const [lockRows] = await ctx.pool.query('SELECT id FROM group_sections WHERE submission_id = ? AND merged = 1', [id]);
    if (lockRows.length) return sendError(ctx, 409, 'Section is locked after merge');

    const content = ctx.body.content ?? null;
    await ctx.pool.query('UPDATE submissions SET content = ? WHERE id = ?', [content, id]);

    const [r2] = await ctx.pool.query(
      'SELECT id, assignment_id, student_id, content, status, submitted_at, created_at FROM submissions WHERE id = ?',
      [id],
    );
    return sendJson(ctx, 200, { submission: r2[0] });
  }

  sendError(ctx, 405, 'Method not allowed');
}