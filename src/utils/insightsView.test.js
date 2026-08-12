import { describe, it, expect } from 'vitest';
import { buildActivityRows, filterPastes, heatmapMatrix } from './insightsView';

const members = [
  { student_id: 1, student_name: 'Alice' },
  { student_id: 2, student_name: 'Bob' },
];

const insights = {
  1: {
    activity: {
      hourly: Array.from({ length: 24 }, (_, h) => ({ h, n: h === 9 ? 5 : 0 })),
      daily: [{ d: '2026-08-10', n: 5 }],
      totalEdits: 5,
    },
    pastes: [
      { ts: 1, len: 100, text: 'copied paragraph', links: [], survived: true, link_only: false, deleted: 0 },
      { ts: 2, len: 30, text: 'https://only.a/link', links: ['https://only.a/link'], survived: true, link_only: true, deleted: 0 },
      { ts: 3, len: 80, text: 'rewritten away', links: [], survived: false, link_only: false, deleted: 70 },
    ],
  },
  2: {
    activity: {
      hourly: Array.from({ length: 24 }, (_, h) => ({ h, n: h === 9 ? 3 : h === 14 ? 2 : 0 })),
      daily: [{ d: '2026-08-10', n: 3 }, { d: '2026-08-11', n: 2 }],
      totalEdits: 5,
    },
    pastes: [],
  },
};

describe('buildActivityRows', () => {
  it('builds hourly rows keyed by member name', () => {
    const rows = buildActivityRows(insights, members, 'hourly');
    expect(rows).toHaveLength(24);
    const nine = rows.find((r) => r.label === '09:00');
    expect(nine.Alice).toBe(5);
    expect(nine.Bob).toBe(3);
    expect(rows.find((r) => r.label === '14:00').Bob).toBe(2);
  });

  it('builds daily rows as the union of all member days', () => {
    const rows = buildActivityRows(insights, members, 'daily');
    expect(rows.map((r) => r.label)).toEqual(['2026-08-10', '2026-08-11']);
    expect(rows[0].Alice).toBe(5);
    expect(rows[0].Bob).toBe(3);
    expect(rows[1].Bob).toBe(2);
    expect(rows[1].Alice ?? 0).toBe(0);
  });

  it('handles missing members gracefully', () => {
    const rows = buildActivityRows({}, members, 'hourly');
    expect(rows).toHaveLength(24);
    expect(rows.every((r) => r.Alice === 0 && r.Bob === 0)).toBe(true);
  });
});

describe('filterPastes', () => {
  const pastes = insights[1].pastes;

  it('returns everything by default', () => {
    expect(filterPastes(pastes)).toHaveLength(3);
  });

  it('hides link-only pastes when toggled', () => {
    const out = filterPastes(pastes, { hideLinkOnly: true });
    expect(out).toHaveLength(2);
    expect(out.every((p) => !p.link_only)).toBe(true);
  });

  it('filters by survival state', () => {
    expect(filterPastes(pastes, { survival: 'survived' }).map((p) => p.len)).toEqual([100, 30]);
    expect(filterPastes(pastes, { survival: 'rewritten' }).map((p) => p.len)).toEqual([80]);
  });
});

describe('heatmapMatrix', () => {
  it('produces a members × 24-hours matrix', () => {
    const m = heatmapMatrix(insights, members);
    expect(m.members).toEqual(['Alice', 'Bob']);
    expect(m.cells).toHaveLength(2);
    expect(m.cells[0]).toHaveLength(24);
    expect(m.cells[0][9]).toBe(5);
    expect(m.cells[1][14]).toBe(2);
    expect(m.max).toBe(5);
  });

  it('max is 0 when there is no activity', () => {
    expect(heatmapMatrix({}, members).max).toBe(0);
  });
});
