// Decision-record layer: turns the engine's computed signals into plain-language
// evidence a lecturer can interrogate. Every factor gets a narrative (what was
// found and what it means) and a flip condition (what would change the call).
// The overall record separates evidence-for-originality from concerns and states
// exactly what would flip the verdict — so a green headline can never hide a red
// factor, and a disputed verdict comes with its own rebuttal instructions.
//
// Pure + deterministic: same signals in, same record out.

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const int = (x) => Math.round(x).toLocaleString();

// ---------------------------------------------------------------- paste

export function explainPaste({ externalPastedChars, unmodifiedPasteChars, typedChars }) {
  if (!externalPastedChars) {
    return {
      narrative: `No external paste recorded — the ${int(typedChars)} characters appear to have been typed.`,
      flip: 'This factor would only change if external paste appeared in the recording.',
    };
  }
  const unmodifiedRatio = unmodifiedPasteChars / Math.max(unmodifiedPasteChars + typedChars, 1);
  if (unmodifiedPasteChars > externalPastedChars * 0.5) {
    return {
      narrative: `${int(unmodifiedPasteChars)} of ${int(externalPastedChars)} pasted characters remain unmodified (${pct(unmodifiedRatio)} of the text) — a large block of pasted text was kept as-is.`,
      flip: 'Would improve if the pasted passages were rewritten in the student’s own words; the more pasted text that gets edited, the lower this concern.',
    };
  }
  return {
    narrative: `${int(externalPastedChars)} characters were pasted but most were rewritten — only ${int(unmodifiedPasteChars)} characters (${pct(unmodifiedRatio)} of the text) remain unmodified.`,
    flip: 'Would improve further if the remaining pasted passages were also reworked.',
  };
}

// ---------------------------------------------------------------- naturalness

export function explainNaturalness({ cv, burstRatio, keystrokeCount }) {
  if (keystrokeCount < 100) {
    return {
      narrative: `Insufficient keystroke data (${int(keystrokeCount)} keystrokes) to judge typing rhythm reliably.`,
      flip: 'Would become meaningful with more recorded typing.',
    };
  }
  const cvStr = cv.toFixed(2);
  if (cv < 0.12) {
    return {
      narrative: `Typing rhythm is extremely consistent (cadence variation ${cvStr}) — steadier than typical human composition${burstRatio > 0.3 ? ', with long sustained bursts and no thinking pauses' : ''}. A steady rhythm can be genuine, so weigh this as one line of evidence, not a conclusion.`,
      flip: 'Would change if the typing showed natural rhythm variation and ordinary pauses between thoughts.',
    };
  }
  if (cv < 0.30) {
    return {
      narrative: `Typing rhythm is unusually consistent (cadence variation ${cvStr}). Some people type very steadily, but this is steadier than typical composition.`,
      flip: 'Would strengthen if the rhythm showed more of the irregularity typical of organic writing.',
    };
  }
  if (cv <= 1.0) {
    return {
      narrative: `Typing rhythm is naturally irregular (cadence variation ${cvStr}), consistent with human composition${burstRatio > 0.3 ? ', though some sustained typing bursts were recorded' : ''}.`,
      flip: 'No change needed — this rhythm supports original composition.',
    };
  }
  return {
    narrative: `Typing rhythm is extremely irregular (cadence variation ${cvStr}). This can be genuine bursty writing with long thinking pauses, but unusually extreme variation can also indicate artificial pauses.`,
    flip: 'Would be reassuring if the long gaps line up with genuine thinking or research; worth a closer look if they look artificially timed.',
  };
}

// ---------------------------------------------------------------- revision

export function explainRevision({ deleteRatio, deletedChars, typedChars, avgWpm }) {
  const ratioStr = pct(deleteRatio);
  if (typedChars < 50) {
    return {
      narrative: `Too little typed text (${int(typedChars)} characters) to judge revision behavior.`,
      flip: 'Would become meaningful with more recorded typing.',
    };
  }
  if (deleteRatio < 0.01) {
    const speedNote = avgWpm > 55 ? ', combined with a very high typing speed' : '';
    return {
      narrative: `Only ${int(deletedChars)} corrections across ${int(typedChars)} characters (${ratioStr}). Organic writing usually involves revision; near-zero corrections can mean a clean type-up of a pre-written draft, or transcription from a source${speedNote}.`,
      flip: 'Would move toward original if an earlier draft showed the text being composed, or if corrections were more frequent during writing. Sustained very high speed with no corrections would strengthen concern.',
    };
  }
  if (deleteRatio < 0.03) {
    return {
      narrative: `A low correction rate (${ratioStr}) — lighter revision than typical, but within a plausible range for a careful typist.`,
      flip: 'Would strengthen with a more typical revision pattern.',
    };
  }
  if (deleteRatio <= 0.35) {
    return {
      narrative: `A natural revision pattern (${ratioStr} correction rate) — typical of organic writing, where the author reworks as they go.`,
      flip: 'No change needed — this revision pattern supports original composition.',
    };
  }
  return {
    narrative: `Heavy rewriting (${ratioStr} of the text was deleted) — extensive reworking, which can be genuine revision or repeated replacement of content.`,
    flip: 'Would be reassuring if the rewrites show iterative composition; less so if content was repeatedly swapped in from elsewhere.',
  };
}

// ---------------------------------------------------------------- engagement

export function explainEngagement({ wpm, activeMinutes, sessions, wordCount }) {
  const base = `${int(wordCount)} words over ${activeMinutes.toFixed(0)} active minute${activeMinutes === 1 ? '' : 's'} (${wpm.toFixed(0)} WPM) across ${sessions} session${sessions === 1 ? '' : 's'}`;
  if (wpm > 45) {
    return {
      narrative: `Output speed is very high — ${base}. Sustained speeds above ~45 WPM are faster than comfortable composition, suggesting transcription or paste-and-light-edit.`,
      flip: 'Would improve if the effective typing pace were within a comfortable composition range.',
    };
  }
  if (wpm < 4 && activeMinutes >= 0.5) {
    return {
      narrative: `Very low output relative to time active — ${base}.`,
      flip: 'Would change if active time aligned with actual writing.',
    };
  }
  return {
    narrative: `Productivity is plausible — ${base}.`,
    flip: 'No change needed — this pace is consistent with genuine writing.',
  };
}

// ---------------------------------------------------------------- integrity

export function explainIntegrity({ timedCount, inconsistentCount }) {
  if (!timedCount) {
    return {
      narrative: 'No server receive times are available (legacy recording), so the client clock could not be cross-checked.',
      flip: 'Would become verifiable with server-stamped events.',
    };
  }
  const trust = 1 - inconsistentCount / timedCount;
  if (trust >= 0.7) {
    return {
      narrative: `Client and server timestamps agree (${int(timedCount - inconsistentCount)} of ${int(timedCount)} events consistent) — the recording is internally reliable.`,
      flip: 'No change needed — the timeline is trustworthy.',
    };
  }
  return {
    narrative: `${int(inconsistentCount)} of ${int(timedCount)} events have client timestamps that deviate from server receive times — the recorded timeline may be unreliable or tampered with.`,
    flip: 'Would improve if client timestamps were consistent with server receive times.',
  };
}

// ---------------------------------------------------------------- decision record

const RED = 40;
const SUPPORTIVE = 70;

export function buildDecisionRecord({ factors, overall, verdict, confidence, needsReview }) {
  const list = Object.values(factors || {});
  const supportive = list.filter((f) => f.score >= SUPPORTIVE);
  const red = list.filter((f) => f.score < RED);

  const evidence_for_originality = supportive
    .sort((a, b) => b.score - a.score)
    .map((f) => `${f.label}: ${f.narrative}`);

  const concerns = red
    .sort((a, b) => a.score - b.score)
    .map((f) => `${f.label}: ${f.narrative}`);

  // Flip conditions = how to resolve each red factor (the ones that matter).
  const flip_conditions = red
    .sort((a, b) => a.score - b.score)
    .map((f) => f.flip)
    .filter(Boolean);

  let summary;
  if (overall < 40) {
    summary = 'Several writing patterns raise concern about this submission — review the evidence below; the final call is yours.';
  } else if (needsReview) {
    summary = 'Mostly original, but one pattern raises a concern — worth a quick look. The final call is yours.';
  } else if (overall < 60) {
    summary = 'The evidence is mixed — several signals are weaker than expected. The final call is yours.';
  } else if (red.length === 0 && overall >= 80) {
    summary = 'This looks like genuine, original writing — you can still inspect the evidence yourself.';
  } else {
    summary = 'The writing looks broadly original, though not every signal is strong.';
  }

  const verdict_rationale = red.length > 0
    ? `Overall ${overall}/100, marked “${verdict}” because ${red.length} signal${red.length > 1 ? 's' : ''} fell below the expected range even though the average stayed high.`
    : `Overall ${overall}/100, marked “${verdict}” with ${confidence} confidence; no signal fell below the expected range.`;

  return { summary, verdict_rationale, evidence_for_originality, concerns, flip_conditions };
}
