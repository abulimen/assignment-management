import { describe, it, expect } from 'vitest';
import {
  explainPaste, explainNaturalness, explainRevision,
  explainEngagement, explainIntegrity, buildDecisionRecord,
} from '../src/explain.js';

// The decision-record layer turns computed signals into plain-language
// evidence a lecturer can interrogate. These tests pin the contract: every
// factor gets a narrative + a flip condition; the overall record separates
// evidence-for from concerns and states what would change the verdict.

describe('explainPaste', () => {
  it('no paste: reports typed text, flip notes nothing to change', () => {
    const r = explainPaste({ externalPastedChars: 0, unmodifiedPasteChars: 0, typedChars: 800 });
    expect(r.narrative).toMatch(/no external paste/i);
    expect(r.narrative).toMatch(/typed/i);
    expect(typeof r.flip).toBe('string');
  });

  it('large unmodified paste: quantifies it as a concern', () => {
    const r = explainPaste({ externalPastedChars: 1000, unmodifiedPasteChars: 900, typedChars: 100 });
    expect(r.narrative).toMatch(/900/);
    expect(r.narrative).toMatch(/paste|pasted/i);
    expect(r.flip).toMatch(/rewrit|edit/i);
  });

  it('paste mostly rewritten: credits the editing', () => {
    const r = explainPaste({ externalPastedChars: 1000, unmodifiedPasteChars: 200, typedChars: 800 });
    expect(r.narrative).toMatch(/rewrit|edited|reworked/i);
  });
});

describe('explainNaturalness', () => {
  it('metronomic cadence: flags machine-like regularity', () => {
    const r = explainNaturalness({ cv: 0.03, burstRatio: 0.9, keystrokeCount: 3000 });
    expect(r.narrative).toMatch(/regular|consistent|machine|metronom/i);
    expect(r.flip).toMatch(/variation|natural/i);
  });

  it('natural cadence: reports human-like irregularity', () => {
    const r = explainNaturalness({ cv: 0.6, burstRatio: 0, keystrokeCount: 900 });
    expect(r.narrative).toMatch(/natural|irregular|human/i);
  });

  it('extreme irregularity: notes it can be genuine or artificial', () => {
    const r = explainNaturalness({ cv: 1.3, burstRatio: 0, keystrokeCount: 900 });
    expect(r.narrative).toMatch(/extrem|very|unusual/i);
  });

  it('insufficient keystrokes: honest about limited evidence', () => {
    const r = explainNaturalness({ cv: 0, burstRatio: 0, keystrokeCount: 20 });
    expect(r.narrative).toMatch(/insufficient|not enough|limited|too few/i);
  });
});

describe('explainRevision', () => {
  it('near-zero corrections: names BOTH benign and concerning readings', () => {
    const r = explainRevision({ deleteRatio: 0.009, deletedChars: 8, typedChars: 881, avgWpm: 38 });
    // Must present the two interpretations, not assume guilt.
    expect(r.narrative).toMatch(/draft|type-?up|clean/i);
    expect(r.narrative).toMatch(/transcri|source/i);
    expect(r.flip).toMatch(/draft|correction|revision/i);
  });

  it('healthy correction rate: reports organic revision', () => {
    const r = explainRevision({ deleteRatio: 0.12, deletedChars: 120, typedChars: 1000, avgWpm: 30 });
    expect(r.narrative).toMatch(/natural|organic|typical|healthy/i);
  });

  it('very high deletion: reports heavy rewriting', () => {
    const r = explainRevision({ deleteRatio: 0.5, deletedChars: 500, typedChars: 1000, avgWpm: 30 });
    expect(r.narrative).toMatch(/heavy|extensive|substantial|rework/i);
  });
});

describe('explainEngagement', () => {
  it('plausible productivity: reports words over active time', () => {
    const r = explainEngagement({ wpm: 25, activeMinutes: 30, sessions: 3, wordCount: 450 });
    expect(r.narrative).toMatch(/450/);
    expect(r.narrative).toMatch(/plausible|reasonable|consistent/i);
  });

  it('very high WPM: flags transcription-speed output', () => {
    const r = explainEngagement({ wpm: 78, activeMinutes: 18, sessions: 1, wordCount: 620 });
    expect(r.narrative).toMatch(/fast|faster|high|speed/i);
    expect(r.flip).toMatch(/speed|pace|slower/i);
  });
});

describe('explainIntegrity', () => {
  it('consistent clocks: reports agreement', () => {
    const r = explainIntegrity({ timedCount: 900, inconsistentCount: 2 });
    expect(r.narrative).toMatch(/agree|consistent|reliable/i);
  });

  it('inconsistent clocks: reports unreliability', () => {
    const r = explainIntegrity({ timedCount: 900, inconsistentCount: 400 });
    expect(r.narrative).toMatch(/deviat|inconsist|unreliable/i);
    expect(r.flip).toMatch(/consistent|timestamp/i);
  });

  it('no server times (legacy): honest that cross-check is unavailable', () => {
    const r = explainIntegrity({ timedCount: 0, inconsistentCount: 0 });
    expect(r.narrative).toMatch(/legacy|unavailable|no server/i);
  });
});

describe('buildDecisionRecord', () => {
  const factor = (key, label, score, narrative, flip) =>
    ({ [key]: { key, label, score, weight: 20, detail: 'd', narrative, flip } });

  it('clean profile: evidence-for present, no concerns, no flip conditions', () => {
    const factors = {
      ...factor('paste_integrity', 'Paste Integrity', 100, 'No external paste detected.', 'flip-p'),
      ...factor('typing_naturalness', 'Typing Naturalness', 95, 'Natural rhythm.', 'flip-t'),
      ...factor('revision_health', 'Revision Behavior', 90, 'Natural revisions.', 'flip-r'),
      ...factor('engagement', 'Engagement', 92, 'Plausible pace.', 'flip-e'),
      ...factor('recording_integrity', 'Recording Integrity', 96, 'Clocks agree.', 'flip-i'),
    };
    const rec = buildDecisionRecord({
      factors, overall: 93, verdict: 'Likely Original', confidence: 'high', needsReview: false,
    });
    expect(rec.summary).toMatch(/supports|consistent with|original/i);
    expect(rec.evidence_for_originality.length).toBeGreaterThanOrEqual(3);
    expect(rec.concerns).toHaveLength(0);
    expect(typeof rec.verdict_rationale).toBe('string');
    expect(Array.isArray(rec.flip_conditions)).toBe(true);
  });

  it('conflicted profile: concerns + flip conditions are surfaced', () => {
    const factors = {
      ...factor('paste_integrity', 'Paste Integrity', 100, 'No external paste detected.', 'flip-p'),
      ...factor('typing_naturalness', 'Typing Naturalness', 100, 'Natural rhythm.', 'flip-t'),
      ...factor('revision_health', 'Revision Behavior', 30, 'Only 8 corrections across 881 chars.', 'Show an earlier draft or more corrections.'),
      ...factor('engagement', 'Engagement', 100, 'Plausible pace.', 'flip-e'),
      ...factor('recording_integrity', 'Recording Integrity', 100, 'Clocks agree.', 'flip-i'),
    };
    const rec = buildDecisionRecord({
      factors, overall: 86, verdict: 'Needs Review', confidence: 'medium', needsReview: true,
    });
    expect(rec.summary).toMatch(/mixed|conflict|concern/i);
    expect(rec.concerns.length).toBeGreaterThanOrEqual(1);
    expect(rec.concerns.join(' ')).toMatch(/8 corrections/);
    expect(rec.flip_conditions.length).toBeGreaterThanOrEqual(1);
    expect(rec.flip_conditions.join(' ')).toMatch(/draft|correction/i);
  });

  it('low-score profile: summary signals concern and lists what would raise it', () => {
    const factors = {
      ...factor('paste_integrity', 'Paste Integrity', 5, 'Most text is unmodified paste.', 'Rewrite pasted text.'),
      ...factor('typing_naturalness', 'Typing Naturalness', 10, 'Metronomic typing.', 'Show natural variation.'),
      ...factor('revision_health', 'Revision Behavior', 15, 'No corrections.', 'Show revisions.'),
      ...factor('engagement', 'Engagement', 40, 'Implausible speed.', 'Slow, natural pace.'),
      ...factor('recording_integrity', 'Recording Integrity', 90, 'Clocks agree.', 'flip-i'),
    };
    const rec = buildDecisionRecord({
      factors, overall: 25, verdict: 'Significant Concerns', confidence: 'low', needsReview: true,
    });
    expect(rec.summary).toMatch(/concern|risk/i);
    expect(rec.concerns.length).toBeGreaterThanOrEqual(3);
    expect(rec.flip_conditions.length).toBeGreaterThanOrEqual(2);
  });
});
