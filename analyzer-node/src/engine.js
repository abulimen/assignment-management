// Originality scoring engine v2 — evidence, not verdicts.
//
// Design principles (the fairness contract lives in tests/fairness.test.js):
//  - Continuous curves, no cliff thresholds.
//  - Weights sum to 100; NO veto caps. Decisive evidence dominates through
//    evidence-weighted redistribution, not arbitrary overrides.
//  - Editing pasted text earns credit back (unmodified paste is what counts).
//  - Little data => low confidence, never fake certainty, never accusations
//    (low-confidence scores are damped toward neutral).
//  - Client clocks are cross-checked against server receive times.
// Pure + deterministic: same input, same output.

import {
  explainPaste, explainNaturalness, explainRevision,
  explainEngagement, explainIntegrity, buildDecisionRecord,
} from './explain.js';

const WEIGHTS = {
  paste_integrity: 30,
  typing_naturalness: 25,
  revision_health: 15,
  engagement: 15,
  recording_integrity: 15,
};

const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const lerp = (x, x0, x1, y0, y1) => y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);

function num(stats, key, fallback = 0) {
  const v = Number(stats?.[key]);
  return Number.isFinite(v) ? v : fallback;
}

function sliceTextLen(content) {
  if (!Array.isArray(content)) return 0;
  let n = 0;
  for (const node of content) {
    if (!node || typeof node !== 'object') continue;
    if (typeof node.text === 'string') n += node.text.length;
    else if (node.content) n += sliceTextLen(node.content);
  }
  return n;
}

// ---------------------------------------------------------------- classify

function classify(events) {
  const keystrokeEvents = [];
  let typedChars = 0;
  let pastedChars = 0; // all multi-char inserts (external + internal)
  let externalPastedChars = 0;
  let deletedChars = 0;
  const pasteRanges = [];

  for (const e of events) {
    const etype = e?.type || '';
    const data = e?.data || {};
    const steps = e?.steps;

    if (etype === 'paste' && data.external_paste) {
      const text = typeof data.pasted_text === 'string' ? data.pasted_text : '';
      pastedChars += text.length;
      externalPastedChars += text.length;
      if (text.length > 0 && Number.isFinite(data.position)) {
        pasteRanges.push({ from: data.position, to: data.position + text.length, orig: text.length, deleted: 0 });
      }
      continue;
    }

    if (Array.isArray(steps) && steps.length > 0) {
      for (const step of steps) {
        if (step?.stepType !== 'replace') continue;
        const from = Number(step.from) || 0;
        const to = Number(step.to) || 0;
        const deleted = Math.max(0, to - from);
        const inserted = sliceTextLen(step.slice?.content);
        if (inserted > 0 && deleted === 0) {
          if (inserted === 1) { keystrokeEvents.push(e); typedChars += 1; }
          else pastedChars += inserted;
        } else if (deleted > 0 && inserted === 0) {
          deletedChars += deleted;
        } else if (deleted > 0 && inserted > 0) {
          deletedChars += deleted;
          if (inserted === 1) { keystrokeEvents.push(e); typedChars += 1; }
          else pastedChars += inserted;
        }
      }
    } else if (etype === 'keystroke') {
      // Legacy shape.
      keystrokeEvents.push(e);
      typedChars += 1;
    } else if (etype === 'paste') {
      const text = typeof data.text === 'string' ? data.text : '';
      pastedChars += text.length;
    } else if (etype === 'delete') {
      deletedChars += Number(data.length) || 0;
    }
  }

  // Overlap deletes onto paste ranges (how much paste got edited away).
  for (const e of events) {
    if (e?.type !== 'delete') continue;
    const pos = Number(e.data?.position);
    const len = Number(e.data?.length);
    if (!Number.isFinite(pos) || !Number.isFinite(len) || len <= 0) continue;
    for (const pr of pasteRanges) {
      if (pos < pr.to && pos + len > pr.from) {
        pr.deleted += Math.max(0, Math.min(pos + len, pr.to) - Math.max(pos, pr.from));
      }
    }
  }

  const unmodifiedPasteChars = pasteRanges.reduce((s, pr) => s + Math.max(0, pr.orig - pr.deleted), 0);
  return { keystrokeEvents, typedChars, pastedChars, externalPastedChars, deletedChars, pasteRanges, unmodifiedPasteChars };
}

// ---------------------------------------------------------------- helpers

function splitSessions(tsEvents, gapSeconds = 120) {
  const sorted = [...tsEvents].filter((e) => Number.isFinite(e.occurred_at)).sort((a, b) => a.occurred_at - b.occurred_at);
  const sessions = [];
  let current = [];
  for (const e of sorted) {
    if (current.length > 0 && e.occurred_at - current[current.length - 1].occurred_at > gapSeconds) {
      sessions.push(current);
      current = [];
    }
    current.push(e);
  }
  if (current.length > 0) sessions.push(current);
  return sessions;
}

function intervalsOf(events, maxGap = 5) {
  const out = [];
  for (let i = 1; i < events.length; i++) {
    const gap = events[i].occurred_at - events[i - 1].occurred_at;
    if (gap > 0 && gap < maxGap) out.push(gap);
  }
  return out;
}

function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stdev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

function median(xs) {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ---------------------------------------------------------------- engine

export function computeVerdict(events, stats) {
  if (!Array.isArray(events) || events.length === 0) {
    return { overall_score: 0, verdict: 'No Data', confidence: 'none', factors: {}, risk_flags: [] };
  }

  const riskFlags = [];
  const cls = classify(events);
  const { keystrokeEvents, typedChars, pastedChars, externalPastedChars, deletedChars, unmodifiedPasteChars } = cls;
  let mechanicalCertainty = 0; // decisive metronomic-typing evidence (0..1)

  const totalMinutes = Math.max(num(stats, 'total_time_ms') / 60000, 0.016);
  const activeMinutes = Math.max(num(stats, 'active_time_ms') || num(stats, 'total_time_ms'), 0) / 60000;
  const avgWpm = num(stats, 'avg_wpm');
  const wordCount = num(stats, 'word_count');

  // Signals collected as each factor computes, fed to the decision record.
  const sig = {
    typedChars, deletedChars, externalPastedChars, unmodifiedPasteChars,
    cv: 0, burstRatio: 0, sessions: 0,
    deleteRatio: 0, wpm: avgWpm, activeMinutes, wordCount,
    timedCount: 0, inconsistentCount: 0,
    keystrokeCount: keystrokeEvents.length,
  };

  // ---- Factor 1: paste integrity (unmodified paste share of final text) ----
  let pasteScore;
  let pasteDetail;
  if (cls.pasteRanges.length === 0) {
    pasteScore = 100;
    pasteDetail = externalPastedChars === 0
      ? 'No external paste recorded'
      : `${externalPastedChars} pasted chars without position data (legacy)`;
  } else {
    const denom = Math.max(typedChars + unmodifiedPasteChars, 1);
    const f = unmodifiedPasteChars / denom;
    pasteScore = Math.round(100 * Math.pow(1 - f, 1.15));
    pasteDetail = `${Math.round(f * 100)}% of final text is unmodified paste (${unmodifiedPasteChars} of ${typedChars + unmodifiedPasteChars} chars; ${cls.pasteRanges.reduce((s, p) => s + p.orig, 0)} pasted total)`;
    if (f > 0.6) riskFlags.push({ level: 'critical', message: 'Most of the final text is unmodified pasted content' });
    else if (f > 0.35) riskFlags.push({ level: 'warning', message: `Substantial unmodified paste: ${unmodifiedPasteChars} chars` });
  }

  // ---- Factor 2: typing naturalness (session-aware cadence + burst check) ----
  let naturalnessScore;
  let naturalnessDetail;
  if (keystrokeEvents.length < 100) {
    naturalnessScore = 60;
    naturalnessDetail = `Limited typing evidence (${keystrokeEvents.length} keystrokes)`;
  } else {
    const sessions = splitSessions(keystrokeEvents);
    let cvSum = 0;
    let wSum = 0;
    for (const session of sessions) {
      const ivs = intervalsOf(session);
      if (ivs.length < 10) continue;
      const cv = mean(ivs) > 0 ? stdev(ivs) / mean(ivs) : 0;
      cvSum += cv * ivs.length;
      wSum += ivs.length;
    }
    const cv = wSum > 0 ? cvSum / wSum : 0;
    sig.cv = cv;
    sig.sessions = sessions.length;
    naturalnessScore = clamp(lerp(cv, 0.08, 0.45, 0, 100));

    // Transcription bursts: long delete-free runs, flat local cadence, no pauses.
    const sortedAll = [...events].filter((e) => Number.isFinite(e.occurred_at)).sort((a, b) => a.occurred_at - b.occurred_at);
    const keySet = new Set(keystrokeEvents);
    let run = [];
    let metronomicChars = 0;
    const scoreRun = () => {
      if (run.length < 50) return;
      const ivs = intervalsOf(run);
      if (ivs.length < 10) return;
      const runCv = mean(ivs) > 0 ? stdev(ivs) / mean(ivs) : 0;
      const hasPause = run.some((e, i) => i > 0 && e.occurred_at - run[i - 1].occurred_at > 2);
      if (runCv < 0.15 && !hasPause) metronomicChars += run.length;
    };
    for (const e of sortedAll) {
      if (e.type === 'delete') { scoreRun(); run = []; }
      else if ((e.type === 'step' || e.type === 'keystroke') && keySet.has(e)) run.push(e);
    }
    scoreRun();

    const burstRatio = typedChars > 0 ? metronomicChars / typedChars : 0;
    sig.burstRatio = burstRatio;
    if (burstRatio > 0) {
      naturalnessScore = Math.round(naturalnessScore * (1 - 0.7 * Math.min(1, burstRatio)));
    }
    // Decisive mechanical-typing evidence, reused by the engagement factor.
    mechanicalCertainty = burstRatio > 0.3
      ? Math.min(1, burstRatio)
      : (cv < 0.12 && keystrokeEvents.length >= 500 ? 0.6 : 0);
    if (burstRatio > 0.5) {
      riskFlags.push({ level: 'critical', message: `Sustained metronomic typing bursts without pauses or corrections (${Math.round(burstRatio * 100)}% of typed chars)` });
    } else if (cv < 0.12) {
      riskFlags.push({ level: 'critical', message: 'Near-constant typing rhythm (uniform cadence, no pauses)' });
    }

    // A mountain of paste with almost no typing makes cadence near-meaningless.
    const coverage = typedChars / Math.max(typedChars + externalPastedChars, 1);
    if (coverage < 0.1) {
      naturalnessScore = Math.round(naturalnessScore * 0.5);
      naturalnessDetail = `Cadence CV ${cv.toFixed(2)}, but typing covers only ${Math.round(coverage * 100)}% of content`;
    } else {
      naturalnessDetail = `Cadence CV ${cv.toFixed(2)} across ${sessions.length} session(s)`;
    }
  }

  // ---- Factor 3: revision health ----
  let revisionScore;
  let revisionDetail;
  if (typedChars < 50) {
    revisionScore = 70;
    revisionDetail = `Insufficient typed volume for revision analysis (${typedChars} chars)`;
  } else {
    const ratio = deletedChars / Math.max(typedChars + deletedChars, 1);
    sig.deleteRatio = ratio;
    if (ratio < 0.03) revisionScore = Math.round(lerp(ratio, 0, 0.03, 10, 100));
    else if (ratio <= 0.35) revisionScore = 100;
    else if (ratio <= 0.7) revisionScore = Math.round(lerp(ratio, 0.35, 0.7, 100, 60));
    else revisionScore = Math.round(lerp(Math.min(ratio, 1), 0.7, 1, 60, 40));
    revisionDetail = `${deletedChars} deleted vs ${typedChars} typed (${(ratio * 100).toFixed(1)}% correction rate)`;
    if (typedChars > 500 && ratio < 0.01 && avgWpm > 55) {
      riskFlags.push({ level: 'warning', message: 'High typing volume with near-zero corrections' });
    }
  }

  // ---- Factor 4: engagement plausibility ----
  let engagementScore;
  let engagementDetail;
  if (activeMinutes < 0.5) {
    engagementScore = 70;
    engagementDetail = 'Negligible observed active time';
  } else {
    const wpm = wordCount / activeMinutes;
    sig.wpm = wpm;
    if (wpm >= 4 && wpm <= 45) engagementScore = 100;
    else if (wpm < 4) engagementScore = Math.round(clamp(lerp(wpm, 0.5, 4, 70, 100), 70, 100));
    else engagementScore = Math.round(Math.max(10, 100 - (wpm - 45) * 1.2));
    // Sustained metronomic output is implausible human engagement too.
    engagementScore = Math.round(engagementScore * (1 - 0.75 * mechanicalCertainty));
    engagementDetail = `${wordCount} words over ${activeMinutes.toFixed(0)} active min (${wpm.toFixed(0)} WPM)`;

    // Single dense burst (everything in <10 min) is worth noting, not punishing.
    const ts = events.map((e) => e.occurred_at).filter(Number.isFinite);
    if (ts.length > 0 && pastedChars + typedChars > 2000) {
      const span = Math.max(...ts) - Math.min(...ts);
      if (span < 600) riskFlags.push({ level: 'warning', message: 'All recorded activity arrived in a single sub-10-minute burst' });
    }
  }

  // ---- Factor 5: recording integrity (client vs server clocks) ----
  let integrityScore;
  let integrityDetail;
  const timed = events.filter((e) => Number.isFinite(e.received_at) && Number.isFinite(e.occurred_at));
  if (timed.length === 0) {
    integrityScore = 75;
    integrityDetail = 'Server receive times unavailable (legacy events)';
  } else {
    const deltas = timed.map((e) => e.received_at - e.occurred_at);
    const med = median(deltas);
    const inconsistent = deltas.filter((d) => Math.abs(d - med) > 30).length;
    sig.timedCount = timed.length;
    sig.inconsistentCount = inconsistent;
    const trust = 1 - inconsistent / timed.length;
    integrityScore = Math.round(100 * Math.pow(Math.max(0, trust), 0.7));
    integrityDetail = `${inconsistent}/${timed.length} events deviate from the median clock offset`;
    if (trust < 0.4) riskFlags.push({ level: 'critical', message: 'Widespread timestamp inconsistency — client-reported times are unreliable' });
    else if (trust < 0.7) riskFlags.push({ level: 'warning', message: 'Client/server timestamp inconsistencies present' });
  }

  // ---- Aggregate (evidence-weighted) ----
  const scores = {
    paste_integrity: pasteScore,
    typing_naturalness: naturalnessScore,
    revision_health: revisionScore,
    engagement: engagementScore,
    recording_integrity: integrityScore,
  };

  // Weight follows evidence strength: with no paste observed and ample
  // typing, paste integrity measured nothing — move half its weight to the
  // factor that DID measure something (typing naturalness). Weights still
  // sum to 100; nothing is vetoed.
  const weights = { ...WEIGHTS };
  if (externalPastedChars === 0 && typedChars > 1000) {
    weights.paste_integrity = 15;
    weights.typing_naturalness = WEIGHTS.typing_naturalness + 15;
  }

  const details = {
    paste_integrity: pasteDetail,
    typing_naturalness: naturalnessDetail,
    revision_health: revisionDetail,
    engagement: engagementDetail,
    recording_integrity: integrityDetail,
  };
  const labels = {
    paste_integrity: 'Paste Integrity',
    typing_naturalness: 'Typing Naturalness',
    revision_health: 'Revision Behavior',
    engagement: 'Engagement',
    recording_integrity: 'Recording Integrity',
  };

  // Plain-language evidence per factor (narrative + what would flip it).
  const explanations = {
    paste_integrity: explainPaste(sig),
    typing_naturalness: explainNaturalness(sig),
    revision_health: explainRevision({ ...sig, avgWpm }),
    engagement: explainEngagement(sig),
    recording_integrity: explainIntegrity(sig),
  };

  const factors = {};
  let overall = 0;
  for (const key of Object.keys(weights)) {
    factors[key] = {
      score: scores[key],
      weight: weights[key],
      label: labels[key],
      detail: details[key],
      narrative: explanations[key].narrative,
      flip: explanations[key].flip,
    };
    overall += scores[key] * weights[key];
  }
  overall = Math.round(overall / 100);

  // Red factors (< 40) are a strong concern on one line of evidence. They do
  // NOT cap the aggregate (no hidden veto) — but they must not be laundered
  // into a clean headline either.
  const flagged = Object.keys(factors)
    .filter((k) => factors[k].score < 40)
    .map((k) => ({ key: k, label: factors[k].label, score: factors[k].score, detail: factors[k].detail }));
  const redCount = flagged.length;

  // Confidence starts from evidence volume; overwhelming paste evidence is
  // itself strong evidence even without keystrokes.
  const coverage = typedChars / Math.max(typedChars + externalPastedChars, 1);
  let volumeConfidence = keystrokeEvents.length >= 300 && events.length >= 200 ? 'high'
    : keystrokeEvents.length >= 100 || events.length >= 100 ? 'medium'
    : 'low';
  if (volumeConfidence === 'low' && externalPastedChars > 500 && coverage < 0.1) volumeConfidence = 'medium';

  // Insufficient evidence => shrink toward neutral (affects the score).
  if (volumeConfidence === 'low') {
    overall = Math.round(overall * 0.7 + 60 * 0.3);
  }

  // Conflict downgrades the reported confidence only — the score above stays
  // the true aggregate, so a red factor is surfaced, never silently averaged away.
  let confidence = volumeConfidence;
  if (redCount >= 2) confidence = 'low';
  else if (redCount === 1 && confidence === 'high') confidence = 'medium';

  // A red factor beside a green aggregate reads "Needs Review", never an
  // unqualified "Likely Original".
  const needsReview = redCount >= 1 && overall >= 60;
  const verdict = needsReview ? 'Needs Review'
    : overall >= 80 ? 'Likely Original'
    : overall >= 60 ? 'Mostly Consistent'
    : overall >= 40 ? 'Mixed Evidence'
    : 'Significant Concerns';

  // The decision record: why this verdict, and what would change it.
  const decision_record = buildDecisionRecord({ factors, overall, verdict, confidence, needsReview });

  return {
    overall_score: overall,
    verdict,
    confidence,
    factors,
    risk_flags: riskFlags,
    needs_review: needsReview,
    flagged_factors: flagged,
    decision_record,
  };
}
