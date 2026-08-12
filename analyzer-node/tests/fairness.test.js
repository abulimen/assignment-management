// The fairness contract. These expectations ARE the scoring spec: if the
// engine violates one, a real student is being treated unfairly or a real
// cheat pattern is slipping through.
import { describe, it, expect } from 'vitest';
import { computeVerdict } from '../src/engine.js';
import {
  genGenuineWriter, genPurePaster, genPasterWhoRewrites,
  genTranscriptionBot, genSparse, genClockTamper, genNaturalButUncorrected,
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

  it('a red factor beside a green aggregate is surfaced, not laundered', () => {
    // The awkward real case: natural cadence + no paste pull the aggregate
    // up, but Revision Behavior is red (near-zero corrections). The headline
    // must NOT be an unqualified "Likely Original / high confidence".
    const { events, stats } = genNaturalButUncorrected();
    const v = computeVerdict(events, stats);
    expect(v.factors.revision_health.score).toBeLessThan(40);
    expect(v.overall_score).toBeGreaterThanOrEqual(60);
    // The aggregate stays honest (no fake cap), but the verdict must not be
    // the clean top band and confidence must not be "high".
    expect(v.verdict).not.toBe('Likely Original');
    expect(v.confidence).not.toBe('high');
    expect(v.needs_review).toBe(true);
    expect(v.flagged_factors.map((f) => f.key)).toContain('revision_health');
  });

  it('a clean profile (no red factors) keeps its normal verdict and needs_review=false', () => {
    const { events, stats } = genGenuineWriter();
    const v = computeVerdict(events, stats);
    expect(v.needs_review).toBe(false);
    expect(v.flagged_factors).toHaveLength(0);
    expect(['Likely Original', 'Mostly Consistent']).toContain(v.verdict);
  });
});

describe('scoring v2 — confidence calibration', () => {
  it('confidence is capped at medium when exactly one factor is red, even with high data volume', () => {
    const { events, stats } = genNaturalButUncorrected();
    const v = computeVerdict(events, stats);
    const redCount = Object.values(v.factors).filter((f) => f.score < 40).length;
    expect(redCount).toBe(1);
    // Plenty of keystrokes (volume would say "high"), but the red factor caps it.
    expect(v.confidence).toBe('medium');
  });

  it('confidence drops to low when two or more factors are red', () => {
    const { events, stats } = genTranscriptionBot();
    const v = computeVerdict(events, stats);
    const redCount = Object.values(v.factors).filter((f) => f.score < 40).length;
    expect(redCount).toBeGreaterThanOrEqual(2);
    expect(v.confidence).toBe('low');
  });

  it('conflict-downgraded confidence does NOT silently cap the score', () => {
    // The score stays the true aggregate; only the label/confidence reflect the
    // conflict. A red factor must not act as a hidden veto on the number.
    const { events, stats } = genNaturalButUncorrected();
    const v = computeVerdict(events, stats);
    expect(v.overall_score).toBeGreaterThanOrEqual(60);
    expect(v.confidence).not.toBe('high');
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

describe('scoring v2 — decision record', () => {
  it('every factor carries a narrative and a flip condition', () => {
    const { events, stats } = genGenuineWriter();
    const v = computeVerdict(events, stats);
    for (const f of Object.values(v.factors)) {
      expect(typeof f.narrative).toBe('string');
      expect(f.narrative.length).toBeGreaterThan(10);
      expect(typeof f.flip).toBe('string');
      expect(f.flip.length).toBeGreaterThan(5);
    }
  });

  it('returns a well-formed decision record', () => {
    const { events, stats } = genGenuineWriter();
    const v = computeVerdict(events, stats);
    const rec = v.decision_record;
    expect(rec).toBeTruthy();
    expect(typeof rec.summary).toBe('string');
    expect(typeof rec.verdict_rationale).toBe('string');
    expect(Array.isArray(rec.evidence_for_originality)).toBe(true);
    expect(Array.isArray(rec.concerns)).toBe(true);
    expect(Array.isArray(rec.flip_conditions)).toBe(true);
  });

  it('the conflicted case surfaces its concern and flip in the record', () => {
    const { events, stats } = genNaturalButUncorrected();
    const v = computeVerdict(events, stats);
    const rec = v.decision_record;
    expect(rec.concerns.length).toBeGreaterThanOrEqual(1);
    expect(rec.concerns.join(' ')).toMatch(/correction|revision/i);
    expect(rec.flip_conditions.length).toBeGreaterThanOrEqual(1);
    expect(rec.summary).toMatch(/mixed|concern/i);
  });

  it('a clean case has evidence-for and no concerns', () => {
    const { events, stats } = genGenuineWriter();
    const v = computeVerdict(events, stats);
    const rec = v.decision_record;
    expect(rec.evidence_for_originality.length).toBeGreaterThanOrEqual(3);
    expect(rec.concerns).toHaveLength(0);
  });

  it('decision record is deterministic', () => {
    const { events, stats } = genNaturalButUncorrected();
    const a = computeVerdict(events, stats).decision_record;
    const b = computeVerdict(events, stats).decision_record;
    expect(b).toEqual(a);
  });
});
