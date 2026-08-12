import { sendJson, sendError, guardRole, missingField } from '../http.js';
import { countSliceTextLength, extractPlainText, strWordCount, round } from '../text.js';

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

  // ---- stats recompute (port of events.php) ----
  let keystrokeCount = 0;
  let pasteCount = 0;
  let deleteCount = 0;
  let cursorJumps = 0;

  const [allEvents] = await ctx.pool.query(
    "SELECT type, data, steps_json, selection_from, selection_to FROM events WHERE submission_id = ? AND type != 'snapshot'",
    [sid],
  );
  for (const row of allEvents) {
    const stepsJson = row.steps_json;
    if (!stepsJson) {
      if (row.type === 'keystroke') keystrokeCount++;
      else if (row.type === 'paste') pasteCount++;
      else if (row.type === 'delete') deleteCount++;
      else if (row.type === 'cursor_jump') cursorJumps++;
      continue;
    }
    let steps = [];
    try { steps = JSON.parse(stepsJson); } catch { /* ignore */ }
    for (const step of steps) {
      if (step.stepType === 'replace') {
        const from = step.from ?? 0;
        const to = step.to ?? 0;
        const deleted = to - from;
        let insertedLen = 0;
        if (step.slice && Array.isArray(step.slice.content)) {
          insertedLen = countSliceTextLength(step.slice.content);
        }
        if (insertedLen > 0 && deleted === 0) {
          if (insertedLen === 1) keystrokeCount++;
          else pasteCount++;
        } else if (deleted > 0) {
          deleteCount++;
        }
      }
      // addMark/removeMark: format changes, not counted
    }
  }

  const [jumpRows] = await ctx.pool.query(
    "SELECT COUNT(*) AS c FROM events WHERE submission_id = ? AND type = 'cursor_jump'",
    [sid],
  );
  cursorJumps = Math.max(cursorJumps, Number(jumpRows[0].c));

  // paste ratio by characters
  const [pasteCharsRows] = await ctx.pool.query(
    "SELECT COALESCE(SUM(CHAR_LENGTH(JSON_UNQUOTE(JSON_EXTRACT(data, '$.pasted_text')))), 0) AS c FROM events WHERE submission_id = ? AND type = 'paste'",
    [sid],
  );
  let pastedChars = Number(pasteCharsRows[0].c) || 0;

  // Best-effort steps_pasted (port of the JSON_TABLE query; guarded).
  try {
    const [stepRows] = await ctx.pool.query(
      "SELECT steps_json FROM events WHERE submission_id = ? AND type = 'paste' AND steps_json IS NOT NULL",
      [sid],
    );
    let stepsPasted = 0;
    for (const r of stepRows) {
      let steps = [];
      try { steps = JSON.parse(r.steps_json); } catch { continue; }
      for (const step of steps) {
        const text = step.slice && step.slice.content && step.slice.content[0] ? step.slice.content[0].text : undefined;
        if (text === undefined) continue;
        const n = parseInt(text, 10);
        const len = Number.isNaN(n) ? 0 : n;
        if (len > 1) stepsPasted += len;
      }
    }
    pastedChars = Math.max(pastedChars, stepsPasted);
  } catch { /* ignore */ }

  const typedChars = keystrokeCount;
  const totalChars = typedChars + pastedChars;
  const pasteRatio = totalChars > 0 ? round(pastedChars / totalChars, 4) : 0;

  const [timeRows] = await ctx.pool.query(
    'SELECT MIN(occurred_at) AS first_ts, MAX(occurred_at) AS last_ts FROM events WHERE submission_id = ?',
    [sid],
  );
  const firstTs = timeRows[0].first_ts;
  const lastTs = timeRows[0].last_ts;
  const totalMs = (firstTs && lastTs) ? round((Number(lastTs) - Number(firstTs)) * 1000) : 0;
  const minutes = totalMs / 60000;
  let wpm = minutes > 0 ? round((keystrokeCount / 5) / minutes, 1) : 0;

  // focus/blur active-time pairing with 3600s cap
  const [fbRows] = await ctx.pool.query(
    "SELECT type, occurred_at FROM events WHERE submission_id = ? AND type IN ('focus', 'blur') ORDER BY occurred_at ASC",
    [sid],
  );
  let activeTimeMs = 0;
  let lastFocus = null;
  for (const fb of fbRows) {
    if (fb.type === 'focus') {
      lastFocus = Number(fb.occurred_at);
    } else if (fb.type === 'blur' && lastFocus !== null) {
      const gap = Number(fb.occurred_at) - lastFocus;
      if (gap > 0 && gap < 3600) activeTimeMs += round(gap * 1000);
      lastFocus = null;
    }
  }
  if (lastFocus !== null) {
    const [lr] = await ctx.pool.query('SELECT MAX(occurred_at) AS last_ts FROM events WHERE submission_id = ?', [sid]);
    const lts = lr[0].last_ts;
    if (lts) {
      const gap = Number(lts) - lastFocus;
      if (gap > 0 && gap < 3600) activeTimeMs += round(gap * 1000);
    }
  }
  if (activeTimeMs === 0) activeTimeMs = totalMs;

  // word count from final content
  let wordCount = null;
  const [cRows] = await ctx.pool.query('SELECT content FROM submissions WHERE id = ?', [sid]);
  const contentRow = cRows[0];
  if (contentRow && contentRow.content) {
    let doc = null;
    try { doc = JSON.parse(contentRow.content); } catch { /* ignore */ }
    if (doc) wordCount = strWordCount(extractPlainText(doc));
  }
  if (wordCount === null) {
    const [eRows] = await ctx.pool.query('SELECT word_count FROM submission_stats WHERE submission_id = ?', [sid]);
    wordCount = eRows[0] ? (eRows[0].word_count || 0) : 0;
  }

  const activeMinutes = activeTimeMs / 60000;
  if (activeMinutes > 0 && activeMinutes < minutes) {
    wpm = round((keystrokeCount / 5) / activeMinutes, 1);
  }

  await ctx.pool.query(`
    INSERT INTO submission_stats (submission_id, total_time_ms, active_time_ms, keystroke_count, paste_count, delete_count, cursor_jumps, avg_wpm, paste_ratio, word_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      total_time_ms = VALUES(total_time_ms),
      active_time_ms = VALUES(active_time_ms),
      keystroke_count = VALUES(keystroke_count),
      paste_count = VALUES(paste_count),
      delete_count = VALUES(delete_count),
      cursor_jumps = VALUES(cursor_jumps),
      avg_wpm = VALUES(avg_wpm),
      paste_ratio = VALUES(paste_ratio),
      word_count = VALUES(word_count)
  `, [sid, totalMs, activeTimeMs, keystrokeCount, pasteCount, deleteCount, cursorJumps, wpm, pasteRatio, wordCount]);

  sendJson(ctx, 200, { received: count });
}