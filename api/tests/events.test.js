import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getHarness, apiCall, registerUser } from './helpers/harness.js';

let h;
let lecturer;
let student;

beforeAll(async () => {
  h = await getHarness();
  lecturer = await registerUser(h.api, { name: 'Events Lecturer', role: 'lecturer' });
  student = await registerUser(h.api, { name: 'Events Student' });
});

afterAll(async () => { await h.close(); });

const DOC = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello world' }] }] });
const PASTE_TEXT = 'This is a long externally pasted paragraph';

async function makeSubmission() {
  const created = await apiCall(h.api, 'assignments', { method: 'POST', token: lecturer.token, body: { title: 'Events Work' } });
  const aid = created.json.assignment.id;
  const sub = await apiCall(h.api, 'submissions', { method: 'POST', token: student.token, body: { assignment_id: aid, content: DOC } });
  return sub.json.submission.id;
}

describe('POST /api/events', () => {
  it('inserts events and recomputes stats faithfully', async () => {
    const sid = await makeSubmission();
    const events = [
      { type: 'step', sequence: 1, occurred_at: 100.0, steps_json: JSON.stringify([{ stepType: 'replace', from: 0, to: 0, slice: { content: [{ text: 'h' }] } }]), data: {} },
      { type: 'focus', sequence: 2, occurred_at: 100.0, data: {} },
      { type: 'paste', sequence: 3, occurred_at: 150.0, data: { external_paste: true, pasted_text: PASTE_TEXT }, steps_json: JSON.stringify([{ stepType: 'replace', from: 0, to: 0, slice: { content: [{ text: PASTE_TEXT }] } }]) },
      { type: 'blur', sequence: 4, occurred_at: 200.0, data: {} },
      { type: 'step', sequence: 5, occurred_at: 210.0, steps_json: JSON.stringify([{ stepType: 'replace', from: 5, to: 8, slice: { content: [] } }]), data: {} },
    ];
    const { status, json } = await apiCall(h.api, 'events', { method: 'POST', token: student.token, body: { submission_id: sid, events } });
    expect(status).toBe(200);
    expect(json.received).toBe(5);

    const [[stats]] = await h.pool.query('SELECT * FROM submission_stats WHERE submission_id = ?', [sid]);
    expect(stats.keystroke_count).toBe(1);
    expect(stats.paste_count).toBe(1);
    expect(stats.delete_count).toBe(1);
    expect(stats.cursor_jumps).toBe(0);
    // total = (210-100)*1000
    expect(stats.total_time_ms).toBe(110000);
    // focus at 100, blur at 200 → 100s
    expect(stats.active_time_ms).toBe(100000);
    expect(stats.word_count).toBe(2); // "hello world"
    // paste_ratio = 42 pasted chars / (1 keystroke + 42 pasted) = 42/43
    expect(Number(stats.paste_ratio)).toBeCloseTo(42 / 43, 4);
  });

  it('422 when events is empty', async () => {
    const sid = await makeSubmission();
    const { status, json } = await apiCall(h.api, 'events', { method: 'POST', token: student.token, body: { submission_id: sid, events: [] } });
    expect(status).toBe(422);
    expect(json.error).toBe('events must be a non-empty array');
  });

  it('404 for a missing submission', async () => {
    const { status, json } = await apiCall(h.api, 'events', { method: 'POST', token: student.token, body: { submission_id: 999999, events: [{ type: 'step' }] } });
    expect(status).toBe(404);
    expect(json.error).toBe('Submission not found');
  });

  it('403 for a non-owner', async () => {
    const sid = await makeSubmission();
    const other = await registerUser(h.api, { name: 'Other Events' });
    const { status, json } = await apiCall(h.api, 'events', { method: 'POST', token: other.token, body: { submission_id: sid, events: [{ type: 'step' }] } });
    expect(status).toBe(403);
    expect(json.error).toBe('Forbidden');
  });

  it('409 when the submission is already submitted', async () => {
    const sid = await makeSubmission();
    await apiCall(h.api, `submissions/${sid}/submit`, { method: 'POST', token: student.token, body: { content: DOC } });
    const { status, json } = await apiCall(h.api, 'events', { method: 'POST', token: student.token, body: { submission_id: sid, events: [{ type: 'step' }] } });
    expect(status).toBe(409);
    expect(json.error).toBe('Cannot add events to submitted submission');
  });
});