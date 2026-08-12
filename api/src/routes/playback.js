import { sendJson, sendError, guard, parseIdParam } from '../http.js';
import { sectionPastedTexts } from '../authorship.js';
import { round } from '../text.js';
import { bucketActivity, pasteInventory, summarizeMember } from '../insights.js';

function parseJsonObj(s) {
  if (s == null) return null;
  if (typeof s === 'string') {
    try { return JSON.parse(s); } catch { return null; }
  }
  return s; // JSON columns arrive pre-parsed from mysql2
}

// GET /api/submissions/:id/playback — realtime + merged branches, ported
// exactly from public/api/playback.php.
export default async function playback(ctx) {
  if (ctx.req.method !== 'GET') return sendError(ctx, 405, 'Method not allowed');
  const user = guard(ctx);
  if (!user) return;
  const id = parseIdParam(ctx, 'Submission ID required');
  if (id === null) return;

  const [rows] = await ctx.pool.query(
    'SELECT id, assignment_id, student_id, status, content, group_id, override_used, override_by, override_reason, done_vector, non_done_members FROM submissions WHERE id = ?',
    [id],
  );
  const sub = rows[0];
  if (!sub) return sendError(ctx, 404, 'Submission not found');

  // Access: lecturers any; students own or group-member (realtime via
  // submissions.group_id, legacy merged via groups.merged_submission_id).
  if (user.role !== 'lecturer' && Number(sub.student_id) !== user.sub) {
    let allowed = false;
    if (sub.group_id) {
      const [gr] = await ctx.pool.query('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?', [sub.group_id, user.sub]);
      allowed = gr.length > 0;
    } else {
      const [gg] = await ctx.pool.query('SELECT id FROM `groups` WHERE merged_submission_id = ?', [id]);
      if (gg.length) {
        const [gr] = await ctx.pool.query('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?', [gg[0].id, user.sub]);
        allowed = gr.length > 0;
      }
    }
    if (!allowed) return sendError(ctx, 403, 'Forbidden');
  }

  const [evRows] = await ctx.pool.query(
    'SELECT type, data, steps_json, selection_from, selection_to, occurred_at, sequence FROM events WHERE submission_id = ? ORDER BY sequence ASC',
    [id],
  );
  const events = evRows.map((e) => {
    const out = {
      type: e.type,
      data: e.data,
      occurred_at: Number(e.occurred_at),
      steps: e.steps_json ? parseJsonObj(e.steps_json) : null,
      selection: {
        from: e.selection_from !== null ? Number(e.selection_from) : null,
        to: e.selection_to !== null ? Number(e.selection_to) : null,
      },
    };
    return out;
  });

  const [statsRows] = await ctx.pool.query('SELECT * FROM submission_stats WHERE submission_id = ?', [id]);
  const stats = statsRows[0] || {};

  // Realtime group submission: bind to the sealed snapshot.
  if (sub.group_id) {
    const [snapRows] = await ctx.pool.query('SELECT * FROM group_doc_snapshots WHERE group_id = ?', [sub.group_id]);
    const snapshot = snapRows[0];
    if (snapshot) {
      const contributions = snapshot.contributions || {};

      const [secRows] = await ctx.pool.query(`
        SELECT gm.student_id, u.name AS student_name,
               s.id AS submission_id,
               ss.word_count, ss.keystroke_count, ss.paste_count,
               ss.total_time_ms, ss.paste_ratio
        FROM group_members gm
        JOIN users u ON u.id = gm.student_id
        LEFT JOIN submissions s
          ON s.assignment_id = ? AND s.student_id = gm.student_id AND s.group_id IS NULL
        LEFT JOIN submission_stats ss ON ss.submission_id = s.id
        WHERE gm.group_id = ?
        ORDER BY gm.joined_at ASC
      `, [sub.assignment_id, sub.group_id]);
      const sections = secRows.map((r) => ({ ...r }));

      const memberChars = {};
      for (const s of sections) {
        memberChars[String(s.student_id)] = Number(contributions[String(s.student_id)] ?? 0);
      }
      const totalChars = Object.values(memberChars).reduce((a, b) => a + b, 0);
      const insights = {};
      for (const row of sections) {
        const chars = memberChars[String(row.student_id)];
        row.surviving_chars = chars;
        row.share_pct = totalChars > 0 ? round((chars / totalChars) * 100, 1) : 0;
        row.pasted_texts = row.submission_id ? await sectionPastedTexts(ctx.pool, Number(row.submission_id)) : [];

        // Per-member insight aggregates (activity, effort, paste inventory).
        if (row.submission_id) {
          const [memEvents] = await ctx.pool.query(
            'SELECT type, data, steps_json, occurred_at, sequence FROM events WHERE submission_id = ? ORDER BY sequence ASC',
            [row.submission_id],
          );
          const decoded = memEvents.map((e) => ({
            type: e.type,
            data: e.data,
            steps: e.steps_json ? parseJsonObj(e.steps_json) : null,
            occurred_at: Number(e.occurred_at),
            sequence: e.sequence,
          }));
          const inv = pasteInventory(decoded).map((p) => ({
            ...p,
            text: p.text.length > 400 ? `${p.text.slice(0, 400)}…` : p.text,
          }));
          insights[String(row.student_id)] = {
            summary: summarizeMember(decoded),
            activity: bucketActivity(decoded),
            pastes: inv,
          };
        }
      }

      let override = null;
      if (Number(sub.override_used) === 1) {
        const [byRows] = await ctx.pool.query('SELECT name FROM users WHERE id = ?', [sub.override_by]);
        const byName = byRows[0] ? byRows[0].name : 'Unknown';
        override = {
          used: true,
          by: Number(sub.override_by),
          by_name: byName,
          reason: sub.override_reason,
          non_done: parseJsonObj(sub.non_done_members) || [],
        };
      }

      return sendJson(ctx, 200, {
        submission_id: Number(sub.id),
        content: snapshot.prosemirror_json,
        events: [], // group-doc playback is a future subsystem
        stats,
        sections,
        insights,
        override,
        done_vector: parseJsonObj(sub.done_vector) || [],
        frozen_at: snapshot.frozen_at,
        realtime: true,
      });
    }
  }

  // Merged (legacy) branch.
  let sections = null;
  const [grpRows] = await ctx.pool.query('SELECT id FROM `groups` WHERE merged_submission_id = ?', [id]);
  const grp = grpRows[0];
  if (grp) {
    const [secRows] = await ctx.pool.query(`
      SELECT gs.id, gs.student_id, gs.submission_id, gs.sort_order, gs.title, gs.merged,
             u.name AS student_name,
             s.status AS submission_status,
             ss.word_count, ss.keystroke_count, ss.paste_count, ss.total_time_ms, ss.paste_ratio
      FROM group_sections gs
      JOIN users u ON u.id = gs.student_id
      LEFT JOIN submissions s ON s.id = gs.submission_id
      LEFT JOIN submission_stats ss ON ss.submission_id = s.id
      WHERE gs.group_id = ?
      ORDER BY gs.sort_order ASC
    `, [grp.id]);
    sections = secRows.map((r) => ({ ...r }));
    for (const sec of sections) {
      sec.pasted_texts = await sectionPastedTexts(ctx.pool, Number(sec.submission_id));
    }
  }

  sendJson(ctx, 200, {
    submission_id: Number(sub.id),
    content: sub.content,
    events,
    stats,
    sections,
  });
}