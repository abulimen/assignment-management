import { sendJson, sendError, guard, parseIdParam } from '../http.js';

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

  const [rows] = await ctx.pool.query('SELECT id, assignment_id, student_id, status FROM submissions WHERE id = ?', [id]);
  const sub = rows[0];
  if (!sub) return sendError(ctx, 404, 'Submission not found');

  if (user.role !== 'lecturer' && Number(sub.student_id) !== user.sub) {
    const [c] = await ctx.pool.query(`
      SELECT COUNT(*) AS c FROM group_members gm1
      JOIN group_members gm2 ON gm1.group_id = gm2.group_id
      WHERE gm1.student_id = ? AND gm2.student_id = ?
    `, [user.sub, sub.student_id]);
    if (Number(c[0].c) === 0) return sendError(ctx, 403, 'Forbidden');
  }

  const [evRows] = await ctx.pool.query(
    'SELECT type, data, steps_json, occurred_at, sequence FROM events WHERE submission_id = ? ORDER BY sequence ASC',
    [id],
  );
  const events = evRows.map((e) => ({
    type: e.type,
    data: e.data,
    occurred_at: Number(e.occurred_at),
    steps: e.steps_json ? parseJsonObj(e.steps_json) : null,
  }));
  const [statsRows] = await ctx.pool.query('SELECT * FROM submission_stats WHERE submission_id = ?', [id]);
  const stats = statsRows[0] || {};

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