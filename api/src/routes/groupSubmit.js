import { sendJson, sendError, guardRole, parseIdParam } from '../http.js';
import { collabRequest } from '../collab.js';
import { countGroupWords } from '../text.js';

// POST /api/groups/:id/submit — two-phase seal with draft-row rollback.
export default async function groupSubmit(ctx) {
  const user = guardRole(ctx, 'student');
  if (!user) return;

  const groupId = parseIdParam(ctx, 'Group ID required');
  if (!groupId) return;
  const data = ctx.body;

  const [gRows] = await ctx.pool.query('SELECT * FROM `groups` WHERE id = ?', [groupId]);
  const group = gRows[0];
  if (!group) return sendError(ctx, 404, 'Group not found');
  if (group.frozen_at) return sendError(ctx, 409, 'Group has already submitted');

  const [mRows] = await ctx.pool.query('SELECT id FROM group_members WHERE group_id = ? AND student_id = ?', [groupId, user.sub]);
  if (!mRows.length) return sendError(ctx, 403, 'Forbidden');
  if (Number(group.leader_id) !== user.sub) return sendError(ctx, 403, 'Only the group leader can submit');

  const [members] = await ctx.pool.query(`
    SELECT gm.student_id, u.name AS student_name,
           COALESCE(gms.status, 'not_started') AS status,
           gms.done_at, gms.last_activity_at
    FROM group_members gm
    JOIN users u ON u.id = gm.student_id
    LEFT JOIN group_member_status gms
      ON gms.group_id = gm.group_id AND gms.student_id = gm.student_id
    WHERE gm.group_id = ?
    ORDER BY gm.joined_at ASC
  `, [groupId]);

  const doneVector = [];
  const nonDone = [];
  for (const m of members) {
    doneVector.push({ student_id: Number(m.student_id), status: m.status, done_at: m.done_at });
    if (m.status !== 'done') {
      nonDone.push({ student_id: Number(m.student_id), student_name: m.student_name, last_activity_at: m.last_activity_at });
    }
  }

  const overrideUsed = nonDone.length > 0;
  let overrideReason = null;
  if (overrideUsed) {
    overrideReason = String(data.override_reason ?? '').trim();
    if (overrideReason === '') {
      const names = nonDone.map((n) => n.student_name).join(', ');
      return sendError(ctx, 409, `Not all members are Done (${names}). Provide override_reason to submit anyway.`);
    }
  }

  // Draft row the Node seal binds to (rolled back if sealing fails).
  const [ir] = await ctx.pool.query(
    'INSERT INTO submissions (assignment_id, student_id, content, status, group_id) VALUES (?, ?, NULL, ?, ?)',
    [group.assignment_id, user.sub, 'draft', groupId],
  );
  const submissionId = ir.insertId;
  await ctx.pool.query('INSERT INTO submission_stats (submission_id) VALUES (?)', [submissionId]);

  const rollback = () => ctx.pool.query("DELETE FROM submissions WHERE id = ? AND status = 'draft'", [submissionId]);

  const res = await collabRequest(ctx.config, 'POST', `/internal/doc/${groupId}/seal`, { submission_id: submissionId });
  if (!res.ok || !(res.body && res.body.sealed)) {
    await rollback();
    return sendError(ctx, 503, 'Collaboration server unavailable — submission not sealed. Try again.');
  }
  if (res.body.alreadySealed) {
    await rollback();
    return sendError(ctx, 409, 'Group has already submitted');
  }

  const [snapRows] = await ctx.pool.query('SELECT prosemirror_json FROM group_doc_snapshots WHERE group_id = ?', [groupId]);
  const snap = snapRows[0];
  if (!snap) {
    await rollback();
    return sendError(ctx, 502, 'Seal produced no snapshot');
  }

  const wordCount = countGroupWords(snap.prosemirror_json);

  await ctx.pool.query(`
    UPDATE submissions
    SET content = ?, status = ?, submitted_at = NOW(),
        override_used = ?, override_by = ?, override_reason = ?,
        done_vector = ?, non_done_members = ?
    WHERE id = ?
  `, [
    snap.prosemirror_json,
    'submitted',
    overrideUsed ? 1 : 0,
    overrideUsed ? user.sub : null,
    overrideUsed ? overrideReason : null,
    JSON.stringify(doneVector),
    JSON.stringify(nonDone),
    submissionId,
  ]);
  await ctx.pool.query('UPDATE submission_stats SET word_count = ? WHERE submission_id = ?', [wordCount, submissionId]);
  await ctx.pool.query('UPDATE `groups` SET merged_submission_id = ? WHERE id = ?', [submissionId, groupId]);

  sendJson(ctx, 200, { submission_id: submissionId, override_used: overrideUsed, non_done_members: nonDone });
}