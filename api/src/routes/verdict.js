import { sendJson, sendError, guard, parseIdParam } from '../http.js';
import { extractPlainText, strWordCount } from '../text.js';

function parseJsonObj(s) {
  if (s == null) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// GET /api/submissions/:id/verdict — forward {events, stats} to the analyzer.
export default async function verdict(ctx) {
  if (ctx.req.method !== 'GET') return sendError(ctx, 405, 'Method not allowed');
  const user = guard(ctx);
  if (!user) return;
  const id = parseIdParam(ctx, 'Submission ID required');
  if (id === null) return;

  const [rows] = await ctx.pool.query('SELECT id, assignment_id, student_id, status, content FROM submissions WHERE id = ?', [id]);
  const sub = rows[0];
  if (!sub) return sendError(ctx, 404, 'Submission not found');

  if (user.role === 'lecturer') {
    const [aRows] = await ctx.pool.query('SELECT course_id FROM assignments WHERE id = ?', [sub.assignment_id]);
    const a = aRows[0];
    if (!a) return sendError(ctx, 403, 'Forbidden');
    const [cm] = await ctx.pool.query(
      "SELECT 1 FROM course_members WHERE course_id = ? AND user_id = ? AND role = 'lecturer'",
      [a.course_id, user.sub],
    );
    if (cm.length === 0) return sendError(ctx, 403, 'Forbidden');
  } else if (Number(sub.student_id) !== user.sub) {
    const [c] = await ctx.pool.query(`
      SELECT COUNT(*) AS c FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.student_id = ? AND gm2.student_id = ?
    `, [user.sub, sub.student_id]);
    if (Number(c[0].c) === 0) return sendError(ctx, 403, 'Forbidden');
  }

  const [evRows] = await ctx.pool.query(
    'SELECT id, type, data, steps_json, occurred_at, received_at, sequence FROM events WHERE submission_id = ? ORDER BY occurred_at ASC, id ASC',
    [id],
  );
  const events = evRows.map((e) => ({
    type: e.type,
    data: e.data,
    occurred_at: Number(e.occurred_at),
    received_at: e.received_at ? new Date(e.received_at).getTime() / 1000 : null,
    steps: e.steps_json ? parseJsonObj(e.steps_json) : null,
  }));
  const [statsRows] = await ctx.pool.query('SELECT * FROM submission_stats WHERE submission_id = ?', [id]);
  let stats = statsRows[0] || {};
  if (sub.content) {
    try {
      const doc = JSON.parse(sub.content);
      const computedWords = strWordCount(extractPlainText(doc));
      if (computedWords > 0) {
        stats = { ...stats, word_count: computedWords };
      }
    } catch {}
  }

  const payload = JSON.stringify({ events, stats });
  let response = null;
  let httpCode = null;
  let errorMsg = null;
  try {
    const res = await fetch(ctx.config.analyzerUrl + '/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    httpCode = res.status;
    response = await res.json();
  } catch (e) {
    errorMsg = e.message || 'connection failed';
  }

  if (errorMsg || httpCode !== 200) {
    return sendJson(ctx, 200, {
      overall_score: 0,
      verdict: 'Analyzer unavailable',
      confidence: 'none',
      factors: {},
      risk_flags: [],
      error: errorMsg ? errorMsg : `HTTP ${httpCode}`,
    });
  }

  sendJson(ctx, 200, response || {});
}