// The fairness contract. These expectations ARE the scoring spec: if the
// engine violates one, a real student is being treated unfairly or a real
// cheat pattern is slipping through.
import { describe, it, expect } from 'vitest';
import { computeVerdict } from '../src/engine.js';
import {
  genGenuineWriter, genPurePaster, genPasterWhoRewrites,
  genTranscriptionBot, genSparse, genClockTamper,
} from './fixtures.js';

describe('scoring v2 — fairness contract', () => {
  it('a genuine writer scores high with no integrity flags', () => {
    const { events, stats } = genGenuineWriter();
    const v = computeVerdict(events, stats);
    expect(v.overall_score).toBeGreaterThanOrEqual(70);
    expect(v.risk_flags.filter((f) => f.level === 'critical')).toHaveLength(0);
    expect(v.factors.paste_integrity.score).toBeGreaterThanOrEqual(80);
    expect(v.factors.typing_naturalness.score).toBeGreaterThanOrEqual(60);
  });

  it('an untouched bulk paster scores low and is flagged', () => {
    const { events, stats } = genPurePaster();
    const v = computeVerdict(events, stats);
    expect(v.overall_score).toBeLessThanOrEqual(45);
    expect(v.risk_flags.some((f) => f.level === 'critical' && /paste/i.test(f.message))).toBe(true);
    expect(v.factors.paste_integrity.score).toBeLessThanOrEqual(30);
  });

  it('a paster who rewrites most of it earns credit back (no cheating flag)', () => {
    const { events, stats } = genPasterWhoRewrites();
    const v = computeVerdict(events, stats);
    const paster = computeVerdict(genPurePaster().events, genPurePaster().stats);
    expect(v.overall_score).toBeGreaterThanOrEqual(55);
    expect(v.overall_score).toBeGreaterThan(paster.overall_score + 10);
    expect(v.risk_flags.filter((f) => f.level === 'critical')).toHaveLength(0);
    // The paste factor must reflect the rewrite: far better than untouched paste.
    expect(v.factors.paste_integrity.score).toBeGreaterThan(paster.factors.paste_integrity.score + 25);
  });

  it('a metronomic transcription bot scores low and is flagged', () => {
    const { events, stats } = genTranscriptionBot();
    const v = computeVerdict(events, stats);
    expect(v.overall_score).toBeLessThanOrEqual(45);
    expect(v.risk_flags.some((f) => f.level === 'critical')).toBe(true);
    expect(v.factors.typing_naturalness.score).toBeLessThanOrEqual(35);
  });

  it('sparse data reports low confidence and never accuses', () => {
    const { events, stats } = genSparse();
    const v = computeVerdict(events, stats);
    expect(v.confidence).toBe('low');
    expect(v.risk_flags.filter((f) => f.level === 'critical')).toHaveLength(0);
    expect(v.overall_score).toBeGreaterThanOrEqual(40);
    expect(v.overall_score).toBeLessThanOrEqual(85);
  });

  it('scattered client-vs-server timestamps damage recording integrity', () => {
    const tampered = genClockTamper();
    const honest = genGenuineWriter();
    const vTampered = computeVerdict(tampered.events, tampered.stats);
    const vHonest = computeVerdict(honest.events, honest.stats);
    expect(vTampered.factors.recording_integrity.score).toBeLessThanOrEqual(60);
    expect(vTampered.risk_flags.some((f) => /timestamp|consisten|integrity/i.test(f.message))).toBe(true);
    expect(vTampered.factors.recording_integrity.score)
      .toBeLessThan(vHonest.factors.recording_integrity.score - 20);
  });

  it('legacy events without server timestamps are not punished', () => {
    const { events, stats } = genGenuineWriter(77);
    const legacy = events.map((e) => {
      const { received_at, ...rest } = e;
      return rest;
    });
    const v = computeVerdict(legacy, stats);
    expect(v.overall_score).toBeGreaterThanOrEqual(65);
    expect(v.risk_flags.filter((f) => /timestamp|integrity/i.test(f.message))).toHaveLength(0);
  });

  it('empty input is "No Data", distinct from a real verdict', () => {
    const v = computeVerdict([], {});
    expect(v.overall_score).toBe(0);
    expect(v.verdict).toBe('No Data');
    expect(v.confidence).toBe('none');
  });
});

describe('scoring v2 — contract shape', () => {
  it('factor weights sum to 100 and every factor scores 0-100', () => {
    const { events, stats } = genGenuineWriter();
    const v = computeVerdict(events, stats);
    const factors = Object.values(v.factors);
    expect(factors.length).toBeGreaterThanOrEqual(5);
    const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
    expect(totalWeight).toBe(100);
    for (const f of factors) {
      expect(f.score).toBeGreaterThanOrEqual(0);
      expect(f.score).toBeLessThanOrEqual(100);
      expect(typeof f.label).toBe('string');
      expect(typeof f.detail).toBe('string');
    }
  });

  it('verdict bands are consistent with the overall score', () => {
    for (const gen of [genGenuineWriter, genPurePaster, genTranscriptionBot]) {
      const { events, stats } = gen();
      const v = computeVerdict(events, stats);
      if (v.overall_score >= 80) expect(v.verdict).toBe('Likely Original');
      else if (v.overall_score >= 60) expect(v.verdict).toBe('Mostly Consistent');
      else if (v.overall_score >= 40) expect(v.verdict).toBe('Mixed Evidence');
      else expect(v.verdict).toBe('Significant Concerns');
    }
  });

  it('is deterministic — same evidence, same verdict', () => {
    const { events, stats } = genGenuineWriter();
    const a = computeVerdict(events, stats);
    const b = computeVerdict(events, stats);
    expect(b).toEqual(a);
  });

  it('keeps the response shape the frontend already renders', () => {
    const { events, stats } = genGenuineWriter();
    const v = computeVerdict(events, stats);
    expect(typeof v.overall_score).toBe('number');
    expect(typeof v.verdict).toBe('string');
    expect(['high', 'medium', 'low']).toContain(v.confidence);
    expect(Array.isArray(v.risk_flags)).toBe(true);
    for (const flag of v.risk_flags) {
      expect(['critical', 'warning']).toContain(flag.level);
      expect(typeof flag.message).toBe('string');
    }
  });
});
