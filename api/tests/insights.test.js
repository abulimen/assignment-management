import { describe, it, expect } from 'vitest';
import { bucketActivity, extractLinks, pasteInventory, summarizeMember } from '../src/insights.js';

const ev = (type, t, data = {}, extra = {}) => ({
  type, occurred_at: t, data, sequence: extra.sequence ?? 1, ...extra,
});

const BASE = 1786500000; // fixed epoch for determinism
const HOUR = 3600;
const DAY = 86400;

describe('extractLinks', () => {
  it('finds http and https urls', () => {
    const text = 'see https://example.com/a and http://foo.bar/b?q=1 end';
    expect(extractLinks(text)).toEqual(['https://example.com/a', 'http://foo.bar/b?q=1']);
  });
  it('returns [] when none', () => {
    expect(extractLinks('plain text only')).toEqual([]);
  });
});

describe('bucketActivity', () => {
  it('buckets edit events by hour-of-day and by day', () => {
    const events = [
      ev('step', BASE), // hour depends on BASE; compute expectations from Date
      ev('step', BASE + 10),
      ev('paste', BASE + HOUR + 5, { external_paste: true, pasted_text: 'x'.repeat(30) }),
      ev('snapshot', BASE + 2 * HOUR), // snapshots are not edits
      ev('focus', BASE),
      ev('blur', BASE + 60),
      ev('step', BASE + DAY + 2 * HOUR),
    ];
    const { hourly, daily, totalEdits } = bucketActivity(events);
    expect(hourly).toHaveLength(24);
    expect(hourly.reduce((s, b) => s + b.n, 0)).toBe(4); // 3 edits on day 1 + 1 on day 2
    expect(daily).toHaveLength(2);
    expect(daily[0].n).toBe(3);
    expect(daily[1].n).toBe(1);
    expect(totalEdits).toBe(4);
  });

  it('handles empty input', () => {
    const { hourly, daily, totalEdits } = bucketActivity([]);
    expect(hourly.reduce((s, b) => s + b.n, 0)).toBe(0);
    expect(daily).toEqual([]);
    expect(totalEdits).toBe(0);
  });
});

describe('pasteInventory', () => {
  it('records each external paste with survival against later deletes', () => {
    const text = 'P'.repeat(100);
    const events = [
      ev('paste', BASE, { external_paste: true, pasted_text: text, position: 10 }, { sequence: 1 }),
      ev('delete', BASE + 60, { position: 10, length: 60 }, { sequence: 2 }), // removes 60 of 100 → 40% left
      ev('paste', BASE + 120, { external_paste: true, pasted_text: 'visit https://cite.example.org/source now and read it', position: 200 }, { sequence: 3 }),
    ];
    const inv = pasteInventory(events);
    expect(inv).toHaveLength(2);
    expect(inv[0].len).toBe(100);
    expect(inv[0].deleted).toBe(60);
    expect(inv[0].survived).toBe(false); // under half of the paste remained
    expect(inv[1].links).toEqual(['https://cite.example.org/source']);
    expect(inv[1].survived).toBe(true); // untouched paste
  });

  it('ignores internal pastes and deletes outside paste ranges', () => {
    const events = [
      ev('paste', BASE, { external_paste: false, position: 0, inserted_length: 50 }),
      ev('delete', BASE + 5, { position: 999, length: 10 }),
    ];
    expect(pasteInventory(events)).toEqual([]);
  });
});

describe('summarizeMember', () => {
  it('computes typed vs pasted chars and sessions', () => {
    const keystroke = (t) => ({
      type: 'step', occurred_at: t, data: {}, sequence: 1,
      steps: [{ stepType: 'replace', from: 0, to: 0, slice: { content: [{ type: 'text', text: 'a' }] } }],
    });
    const events = [
      keystroke(BASE),
      keystroke(BASE + 1),
      ev('paste', BASE + 2, { external_paste: true, pasted_text: 'Q'.repeat(60), position: 0 }),
      ev('focus', BASE),
      ev('blur', BASE + 300),
      ev('focus', BASE + 2 * HOUR),
      ev('blur', BASE + 2 * HOUR + 300),
    ];
    const s = summarizeMember(events);
    expect(s.typed_chars).toBe(2);
    expect(s.pasted_chars).toBe(60);
    expect(s.external_pastes).toBe(1);
    expect(s.sessions).toBe(2);
    expect(s.active_seconds).toBe(600);
  });
});
