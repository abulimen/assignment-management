import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getHarness, apiCall, registerUser } from './helpers/harness.js';

let h;
let lecturer;

beforeAll(async () => {
  h = await getHarness();
  lecturer = await registerUser(h.api, { name: 'Review Lecturer', role: 'lecturer' });
});

afterAll(async () => { await h.close(); });

async function makeSubmittedGroup({ overrideReason = null } = {}) {
  const created = await apiCall(h.api, 'assignments', { method: 'POST', token: lecturer.token, body: { title: 'Review Work', is_group_work: 1 } });
  const aid = created.json.assignment.id;
  const leader = await registerUser(h.api, { name: 'Rev Leader' });
  const mate = await registerUser(h.api, { name: 'Rev Mate' });
  const g = await apiCall(h.api, 'groups', { method: 'POST', token: leader.token, body: { assignment_id: aid, name: 'Review Team' } });
  await apiCall(h.api, 'groups/join', { method: 'POST', token: mate.token, body: { invite_code: g.json.group.invite_code } });

  // anchor submissions so the realtime sections query has per-member rows
  const anchorIds = {};
  for (const m of [leader, mate]) {
    const r = await apiCall(h.api, 'submissions', { method: 'POST', token: m.token, body: { assignment_id: aid } });
    anchorIds[m.user.id] = r.json.submission.id;
  }

  await apiCall(h.api, `groups/${g.json.group.id}/done`, { method: 'POST', token: leader.token, body: {} });
  if (!overrideReason) await apiCall(h.api, `groups/${g.json.group.id}/done`, { method: 'POST', token: mate.token, body: {} });

  const sub = await apiCall(h.api, `groups/${g.json.group.id}/submit`, {
    method: 'POST', token: leader.token,
    body: overrideReason ? { override_reason: overrideReason } : {},
  });
  expect(sub.status).toBe(200);
  return { group: g.json.group, leader, mate, anchorIds, submissionId: sub.json.submission_id };
}

describe('GET /api/submissions/:id/playback', () => {
  it('serves the sealed realtime snapshot with sections and no override', async () => {
    const { leader, anchorIds, submissionId } = await makeSubmittedGroup();
    const { status, json } = await apiCall(h.api, `submissions/${submissionId}/playback`, { token: lecturer.token });
    expect(status).toBe(200);
    expect(json.realtime).toBe(true);
    expect(json.content).toContain('the group essay');
    expect(json.override).toBeNull();
    expect(Array.isArray(json.done_vector)).toBe(true);
    expect(json.sections).toHaveLength(2);
    const mine = json.sections.find((s) => String(s.student_id) === String(leader.user.id));
    expect(mine.submission_id).toBe(anchorIds[leader.user.id]);
    expect(Array.isArray(mine.pasted_texts)).toBe(true);
    expect(mine.surviving_chars).toBe(0); // stub contributions are empty
  });

  it('carries the override record when one was used', async () => {
    const { mate, submissionId } = await makeSubmittedGroup({ overrideReason: 'deadline tonight' });
    const { json } = await apiCall(h.api, `submissions/${submissionId}/playback`, { token: lecturer.token });
    expect(json.override).toBeTruthy();
    expect(json.override.used).toBe(true);
    expect(json.override.reason).toBe('deadline tonight');
    expect(json.override.by_name).toBe('Rev Leader');
    expect(json.override.non_done.map((n) => n.student_id)).toContain(mate.user.id);
  });

  it('403 for an outsider student', async () => {
    const { submissionId } = await makeSubmittedGroup();
    const outsider = await registerUser(h.api, { name: 'Review Outsider' });
    const { status } = await apiCall(h.api, `submissions/${submissionId}/playback`, { token: outsider.token });
    expect(status).toBe(403);
  });

  it('200 for a teammate', async () => {
    const { mate, submissionId } = await makeSubmittedGroup();
    const { status, json } = await apiCall(h.api, `submissions/${submissionId}/playback`, { token: mate.token });
    expect(status).toBe(200);
    expect(json.realtime).toBe(true);
  });

  it('includes per-member insight aggregates', async () => {
    const { leader, anchorIds, submissionId } = await makeSubmittedGroup();
    // Seed the leader's anchor with a small event history.
    const now = Date.now() / 1000;
    const events = [
      { type: 'step', data: {}, steps_json: JSON.stringify([{ stepType: 'replace', from: 0, to: 0, slice: { content: [{ type: 'text', text: 'a' }] } }]), occurred_at: now, sequence: 1 },
      { type: 'paste', data: { external_paste: true, pasted_text: 'https://example.com/source ' + 'x'.repeat(40), position: 1 }, steps_json: null, occurred_at: now + 5, sequence: 2 },
      { type: 'focus', data: {}, steps_json: null, occurred_at: now, sequence: 3 },
      { type: 'blur', data: {}, steps_json: null, occurred_at: now + 120, sequence: 4 },
    ];
    await apiCall(h.api, 'events', { method: 'POST', token: leader.token, body: { submission_id: anchorIds[leader.user.id], events } });

    const { status, json } = await apiCall(h.api, `submissions/${submissionId}/playback`, { token: lecturer.token });
    expect(status).toBe(200);
    const mine = json.insights[String(leader.user.id)];
    expect(mine).toBeTruthy();
    expect(mine.summary.typed_chars).toBe(1);
    expect(mine.summary.external_pastes).toBe(1);
    expect(mine.summary.sessions).toBe(1);
    expect(mine.activity.hourly).toHaveLength(24);
    expect(mine.activity.totalEdits).toBe(2); // step + paste
    expect(mine.pastes).toHaveLength(1);
    expect(mine.pastes[0].links).toContain('https://example.com/source');
    expect(mine.pastes[0].survived).toBe(true);
  });

  it('404 for a missing submission', async () => {
    const { json } = await apiCall(h.api, 'submissions/999999/playback', { token: lecturer.token });
    expect(json.error).toBe('Submission not found');
  });
});

describe('GET /api/submissions/:id/verdict', () => {
  async function makeSubmissionWithEvents() {
    const created = await apiCall(h.api, 'assignments', { method: 'POST', token: lecturer.token, body: { title: 'Verdict Work' } });
    const aid = created.json.assignment.id;
    const s = await registerUser(h.api, { name: 'Verdict Student' });
    const sub = await apiCall(h.api, 'submissions', { method: 'POST', token: s.token, body: { assignment_id: aid } });
    await apiCall(h.api, 'events', {
      method: 'POST', token: s.token,
      body: { submission_id: sub.json.submission.id, events: [{ type: 'step', sequence: 1, occurred_at: 100.0, data: {} }] },
    });
    return { sid: sub.json.submission.id, token: s.token };
  }

  it('returns the analyzer verdict via the stub', async () => {
    const { sid, token } = await makeSubmissionWithEvents();
    const { status, json } = await apiCall(h.api, `submissions/${sid}/verdict`, { token });
    expect(status).toBe(200);
    expect(json.overall_score).toBe(77);
    expect(json.verdict).toBe('Likely Original');
    expect(json.confidence).toBe('high');
  });

  it('forwards server receive times to the analyzer (recording-integrity input)', async () => {
    const { sid, token } = await makeSubmissionWithEvents();
    const { status, json } = await apiCall(h.api, `submissions/${sid}/verdict`, { token });
    expect(status).toBe(200);
    // The stub echoes whether the events it received carried received_at.
    expect(json.received_at_present).toBe(true);
  });

  it('returns the fallback shape when the analyzer is unreachable', async () => {
    const { sid, token } = await makeSubmissionWithEvents();
    const isolated = await (await import('./helpers/harness.js')).startApi({
      config: { analyzerUrl: 'http://127.0.0.1:29999', collabUrl: `http://127.0.0.1:${h.collabPort}` },
    });
    try {
      const { status, json } = await apiCall(isolated, `submissions/${sid}/verdict`, { token });
      expect(status).toBe(200);
      expect(json.overall_score).toBe(0);
      expect(json.verdict).toBe('Analyzer unavailable');
      expect(json.confidence).toBe('none');
      expect(json.error).toBeTruthy();
    } finally {
      await isolated.close();
    }
  });

  it('403 for an unrelated student', async () => {
    const { sid } = await makeSubmissionWithEvents();
    const other = await registerUser(h.api, { name: 'Verdict Outsider' });
    const { status } = await apiCall(h.api, `submissions/${sid}/verdict`, { token: other.token });
    expect(status).toBe(403);
  });
});