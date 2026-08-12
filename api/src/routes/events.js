import { sendJson, sendError, guardRole, missingField } from '../http.js';
import { recomputeSubmissionStats } from '@am/core';

// POST /api/events — HTTP fallback intake; recompute + upsert submission_stats.
// Ported line-by-line from public/api/events.php.
export default async function events(ctx) {
  if (ctx.req.method !== 'POST') return sendError(ctx, 405, 'Method not allowed');
  const user = guardRole(ctx, 'student');
  if (!user) return;
  const data = ctx.body;

  if (missingField(data, 'submission_id')) return sendError(ctx, 422, 'Missing required field: submission_id');
  if (data.events === undefined) return sendError(ctx, 422, 'Missing required field: events');
  if (!Array.isArray(data.events) || data.events.length === 0) return sendError(ctx, 422, 'events must be a non-empty array');

  const [sRows] = await ctx.pool.query('SELECT student_id, status FROM submissions WHERE id = ?', [data.submission_id]);
  const sub = sRows[0];
  if (!sub) return sendError(ctx, 404, 'Submission not found');
  if (Number(sub.student_id) !== user.sub) return sendError(ctx, 403, 'Forbidden');
  if (sub.status === 'submitted') return sendError(ctx, 409, 'Cannot add events to submitted submission');

  const [lockRows] = await ctx.pool.query('SELECT id FROM group_sections WHERE submission_id = ? AND merged = 1', [data.submission_id]);
  if (lockRows.length) return sendError(ctx, 409, 'Section is locked after merge');

  const sid = data.submission_id;
  const receivedAt = new Date(); // server truth, same as the WS intake
  let count = 0;
  for (const ev of data.events) {
    await ctx.pool.query(
      'INSERT INTO events (submission_id, type, data, steps_json, selection_from, selection_to, occurred_at, sequence, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        sid,
        ev.type ?? 'step',
        JSON.stringify(ev.data ?? []),
        ev.steps_json ?? null,
        ev.selection_from ?? null,
        ev.selection_to ?? null,
        ev.occurred_at,
        ev.sequence,
        receivedAt,
      ],
    );
    count++;
  }

  // Stats recompute is shared with the realtime WS intake (single source).
  await recomputeSubmissionStats(ctx.pool, sid);

  sendJson(ctx, 200, { received: count });
}