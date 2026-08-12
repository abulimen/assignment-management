// Deterministic synthetic writing sessions for the fairness suite.
// Event shapes match the production tracker (useTracker.js):
//   keystroke  → type 'step', single-char replace step
//   delete     → type 'delete', data {position, length}
//   ext paste  → type 'paste', data {external_paste:true, pasted_text, position}
//   snapshot   → type 'snapshot', data {doc}
// occurred_at = client clock (epoch seconds), received_at = server clock.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gamma-ish inter-keystroke interval: bursty, human-like (CV ≈ 0.5+).
function humanInterval(rng) {
  const base = -Math.log(1 - rng()) * 0.14; // exponential, mean ~0.14s
  return base + rng() * 0.12 + (rng() < 0.06 ? 0.8 + rng() * 2.2 : 0);
}

function stepEvent(ch, pos, t, seq, receivedOffset = 0.4) {
  return {
    type: 'step',
    data: {},
    steps: [{ stepType: 'replace', from: pos, to: pos, slice: { content: [{ type: 'text', text: ch }] } }],
    occurred_at: t,
    received_at: t + receivedOffset,
    sequence: seq,
  };
}

function deleteEvent(pos, len, t, seq, receivedOffset = 0.4) {
  return {
    type: 'delete',
    data: { position: pos, length: len },
    steps: [{ stepType: 'replace', from: pos, to: pos + len, slice: { content: [] } }],
    occurred_at: t,
    received_at: t + receivedOffset,
    sequence: seq,
  };
}

function pasteEvent(text, pos, t, seq, external = true, receivedOffset = 0.4) {
  return {
    type: 'paste',
    data: external
      ? { external_paste: true, pasted_text: text, pasted_text_length: text.length, position: pos, source: 'clipboard' }
      : { external_paste: false, position: pos, inserted_length: text.length, source: 'internal_or_autocomplete' },
    steps: [{ stepType: 'replace', from: pos, to: pos, slice: { content: [{ type: 'text', text }] } }],
    occurred_at: t,
    received_at: t + receivedOffset,
    sequence: seq,
  };
}

function snapshotEvent(docChars, t, seq) {
  return {
    type: 'snapshot',
    data: { doc: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x'.repeat(docChars) }] }] } },
    occurred_at: t,
    received_at: t + 0.4,
    sequence: seq,
  };
}

// A real student: three sessions, natural cadence, corrections, one small
// paste that gets mostly rewritten. ~450 words over ~35 active minutes.
export function genGenuineWriter(seed = 11) {
  const rng = mulberry32(seed);
  const events = [];
  let seq = 0;
  let t = 1786500000;
  let pos = 1;
  let docLen = 0;
  const sessionStarts = [0, 2200, 4100]; // seconds offset between sessions

  for (const start of sessionStarts) {
    t = 1786500000 + start;
    const chars = 800 + Math.floor(rng() * 250);
    for (let i = 0; i < chars; i++) {
      t += humanInterval(rng);
      events.push(stepEvent('a', pos, t, ++seq));
      pos += 1; docLen += 1;
      // ~7% corrections: delete 1-6 chars shortly after typing
      if (rng() < 0.07 && docLen > 10) {
        t += 0.3 + rng() * 0.9;
        const len = 1 + Math.floor(rng() * 6);
        const delPos = Math.max(1, docLen - len - Math.floor(rng() * 20));
        events.push(deleteEvent(delPos, len, t, ++seq));
        docLen -= len;
      }
      if (seq % 30 === 0) events.push(snapshotEvent(docLen, t, ++seq));
    }
  }

  // One small external paste, then most of it deleted (rewritten).
  const pasted = 'P'.repeat(120);
  t += 30;
  events.push(pasteEvent(pasted, pos, t, ++seq));
  pos += 120;
  t += 45; // student reads it, decides to keep only a bit
  events.push(deleteEvent(pos - 120 + 40, 80, t, ++seq)); // deletes 80 of the 120

  return {
    events,
    stats: {
      keystroke_count: events.filter((e) => e.type === 'step').length,
      paste_count: 1,
      delete_count: events.filter((e) => e.type === 'delete').length,
      cursor_jumps: 0,
      avg_wpm: 28,
      paste_ratio: 0.04,
      total_time_ms: 35 * 60000,
      active_time_ms: 26 * 60000,
      word_count: Math.floor(docLen / 5),
    },
  };
}

// Everything arrived via clipboard; no typing at all.
export function genPurePaster(seed = 22) {
  const rng = mulberry32(seed);
  const events = [];
  let seq = 0;
  let t = 1786500000;
  let pos = 1;
  let total = 0;
  for (let i = 0; i < 3; i++) {
    t += 60 + rng() * 90;
    const text = 'Q'.repeat(1100 + Math.floor(rng() * 300));
    events.push(pasteEvent(text, pos, t, ++seq));
    pos += text.length;
    total += text.length;
  }
  return {
    events,
    stats: {
      keystroke_count: 0,
      paste_count: 3,
      delete_count: 0,
      cursor_jumps: 0,
      avg_wpm: 0,
      paste_ratio: 1,
      total_time_ms: 5 * 60000,
      active_time_ms: 4 * 60000,
      word_count: Math.floor(total / 5),
    },
  };
}

// Pastes a big block, then deletes most of it and writes their own version.
// The fairness case: genuine rewriting must earn credit back.
export function genPasterWhoRewrites(seed = 33) {
  const rng = mulberry32(seed);
  const events = [];
  let seq = 0;
  let t = 1786500000;
  let pos = 1;

  const pasted = 'R'.repeat(1000);
  t += 30;
  events.push(pasteEvent(pasted, pos, t, ++seq));
  pos += 1000;

  // Deletes 750 of the 1000 pasted chars over a few minutes.
  let deleted = 0;
  while (deleted < 750) {
    t += 1.5 + rng() * 3;
    const len = Math.min(5 + Math.floor(rng() * 15), 750 - deleted);
    events.push(deleteEvent(pos - 1000 + deleted, len, t, ++seq));
    deleted += len;
  }

  // Types 900 original chars with natural cadence.
  for (let i = 0; i < 900; i++) {
    t += humanInterval(rng);
    events.push(stepEvent('b', pos, t, ++seq));
    pos += 1;
    if (rng() < 0.06) {
      t += 0.4;
      events.push(deleteEvent(Math.max(1, pos - 8), 2, t, ++seq));
      pos -= 2;
    }
    if (seq % 30 === 0) events.push(snapshotEvent(pos, t, ++seq));
  }

  return {
    events,
    stats: {
      keystroke_count: 900,
      paste_count: 1,
      delete_count: events.filter((e) => e.type === 'delete').length,
      cursor_jumps: 0,
      avg_wpm: 30,
      paste_ratio: 0.3,
      total_time_ms: 22 * 60000,
      active_time_ms: 17 * 60000,
      word_count: 230,
    },
  };
}

// Retypes from another screen: metronomic intervals, zero corrections,
// no thinking pauses, one uninterrupted run.
export function genTranscriptionBot(seed = 44) {
  const events = [];
  let seq = 0;
  let t = 1786500000;
  const jitter = mulberry32(seed);
  for (let i = 0; i < 3200; i++) {
    t += 0.085 + (jitter() - 0.5) * 0.004; // CV ≈ 0.02
    events.push(stepEvent('c', i + 1, t, ++seq));
    if (seq % 30 === 0) events.push(snapshotEvent(i, t, ++seq));
  }
  return {
    events,
    stats: {
      keystroke_count: 3200,
      paste_count: 0,
      delete_count: 0,
      cursor_jumps: 0,
      avg_wpm: 78,
      paste_ratio: 0,
      total_time_ms: 18 * 60000,
      active_time_ms: 18 * 60000,
      word_count: 620,
    },
  };
}

// The awkward real case: natural, irregular cadence (high CV — human-like)
// but near-zero corrections and no paste. Types a clean draft fluently. This
// is the profile that produces a green aggregate beside a RED Revision
// Behavior factor; the engine must not present it as an unqualified "Likely
// Original / high confidence". (Correction rate ~0.5%, like a clean typist
// or a careful transcription.)
export function genNaturalButUncorrected(seed = 77) {
  const rng = mulberry32(seed);
  const events = [];
  let seq = 0;
  let t = 1786500000;
  let pos = 1;
  // Bursty human cadence: CV well above 0.45, including thinking pauses.
  for (let i = 0; i < 880; i++) {
    t += -Math.log(1 - rng()) * 0.13 + rng() * 0.1 + (rng() < 0.08 ? 0.9 + rng() * 2.4 : 0);
    events.push(stepEvent('n', pos, t, ++seq));
    pos += 1;
    if (rng() < 0.005) { // ~0.5% correction rate — firmly in the red band
      t += 0.4;
      events.push(deleteEvent(Math.max(1, pos - 5), 1, t, ++seq));
      pos -= 1;
    }
    if (seq % 30 === 0) events.push(snapshotEvent(pos, t, ++seq));
  }
  return {
    events,
    stats: {
      keystroke_count: 880,
      paste_count: 0,
      delete_count: events.filter((e) => e.type === 'delete').length,
      cursor_jumps: 0,
      avg_wpm: 38,
      paste_ratio: 0,
      total_time_ms: 24 * 60000,
      active_time_ms: 20 * 60000,
      word_count: 170,
    },
  };
}

// Barely any data — the engine must be honest about uncertainty.
export function genSparse(seed = 55) {
  const rng = mulberry32(seed);
  const events = [];
  let t = 1786500000;
  for (let i = 0; i < 25; i++) {
    t += 0.2 + rng() * 0.8;
    events.push(stepEvent('d', i + 1, t, i + 1));
  }
  return {
    events,
    stats: {
      keystroke_count: 25,
      paste_count: 0,
      delete_count: 0,
      cursor_jumps: 0,
      avg_wpm: 12,
      paste_ratio: 0,
      total_time_ms: 40000,
      active_time_ms: 30000,
      word_count: 5,
    },
  };
}

// Genuine-ish typing but the client clock is being lied about per-event
// (scattered offsets vs the server's received_at).
export function genClockTamper(seed = 66) {
  const rng = mulberry32(seed);
  const events = [];
  let seq = 0;
  let t = 1786500000;
  for (let i = 0; i < 1200; i++) {
    t += humanInterval(rng);
    const received = t + 0.4; // server truth
    const lied = t + (rng() < 0.5 ? -1 : 1) * (1200 + rng() * 2400); // ±20-60 min
    const e = stepEvent('e', i + 1, lied, ++seq);
    e.received_at = received;
    events.push(e);
  }
  return {
    events,
    stats: {
      keystroke_count: 1200,
      paste_count: 0,
      delete_count: 0,
      cursor_jumps: 0,
      avg_wpm: 40,
      paste_ratio: 0,
      total_time_ms: 20 * 60000,
      active_time_ms: 15 * 60000,
      word_count: 230,
    },
  };
}
