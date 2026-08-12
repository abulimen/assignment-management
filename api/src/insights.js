// Review-page insight aggregation: computed server-side so raw per-member
// event streams never ride the playback payload. Pure + deterministic.

const URL_RE = /https?:\/\/[^\s<>"']+/g;

export function extractLinks(text) {
  if (typeof text !== 'string' || !text) return [];
  return text.match(URL_RE) || [];
}

const EDIT_TYPES = new Set(['step', 'paste', 'delete']);

// Hour-of-day (24 buckets) and per-day counts of EDIT events. Snapshots and
// focus/blur are observation events, not edits.
export function bucketActivity(events) {
  const hourly = Array.from({ length: 24 }, (_, h) => ({ h, n: 0 }));
  const byDay = new Map();
  let totalEdits = 0;

  for (const e of events || []) {
    if (!EDIT_TYPES.has(e.type)) continue;
    const t = Number(e.occurred_at);
    if (!Number.isFinite(t)) continue;
    const d = new Date(t * 1000);
    hourly[d.getHours()].n += 1;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    byDay.set(key, (byDay.get(key) || 0) + 1);
    totalEdits += 1;
  }

  const daily = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([d, n]) => ({ d, n }));

  return { hourly, daily, totalEdits };
}

// External paste inventory with survival (did the pasted text stay, or did
// the student edit it away). Survival >= 50% of the original length counts.
export function pasteInventory(events) {
  const list = events || [];
  const pastes = [];
  for (const e of list) {
    const data = e.data || {};
    if (e.type !== 'paste' || !data.external_paste) continue;
    const text = typeof data.pasted_text === 'string' ? data.pasted_text : '';
    if (!text) continue;
    const pos = Number(data.position) || 0;
    pastes.push({
      ts: Number(e.occurred_at) || 0,
      sequence: e.sequence ?? null,
      len: text.length,
      text,
      links: extractLinks(text),
      from: pos,
      to: pos + text.length,
      deleted: 0,
    });
  }

  for (const e of list) {
    if (e.type !== 'delete') continue;
    const data = e.data || {};
    const pos = Number(data.position);
    const len = Number(data.length);
    if (!Number.isFinite(pos) || !Number.isFinite(len) || len <= 0) continue;
    for (const p of pastes) {
      if (pos < p.to && pos + len > p.from) {
        p.deleted += Math.max(0, Math.min(pos + len, p.to) - Math.max(pos, p.from));
      }
    }
  }

  return pastes.map((p) => ({
    ts: p.ts,
    sequence: p.sequence,
    len: p.len,
    text: p.text,
    links: p.links,
    deleted: p.deleted,
    link_only: p.links.length > 0 && p.text.replace(URL_RE, '').trim().length === 0,
    survived: p.len > 0 ? (p.len - p.deleted) / p.len >= 0.5 : false,
  }));
}

// Per-member effort summary from their own event stream.
export function summarizeMember(events) {
  let typedChars = 0;
  let pastedChars = 0;
  let externalPastes = 0;
  let activeSeconds = 0;
  let sessions = 0;
  let lastFocus = null;

  const list = (events || []).slice().sort(
    (a, b) => (Number(a.occurred_at) || 0) - (Number(b.occurred_at) || 0),
  );

  for (const e of list) {
    const data = e.data || {};
    if (e.type === 'paste' && data.external_paste) {
      externalPastes += 1;
      pastedChars += typeof data.pasted_text === 'string' ? data.pasted_text.length : 0;
    } else if (e.type === 'focus') {
      if (lastFocus === null) sessions += 1;
      lastFocus = Number(e.occurred_at) || 0;
    } else if (e.type === 'blur' && lastFocus !== null) {
      const gap = (Number(e.occurred_at) || 0) - lastFocus;
      if (gap > 0 && gap < 3600) activeSeconds += gap;
      lastFocus = null;
    }
  }

  // Count single-char inserts as typed characters.
  for (const e of list) {
    if (e.type !== 'step' || !Array.isArray(e.steps)) continue;
    for (const step of e.steps) {
      if (step.stepType !== 'replace') continue;
      const deleted = Math.max(0, (step.to ?? 0) - (step.from ?? 0));
      const inserted = countSliceText(step.slice?.content);
      if (inserted === 1 && deleted === 0) typedChars += 1;
    }
  }

  return {
    typed_chars: typedChars,
    pasted_chars: pastedChars,
    external_pastes: externalPastes,
    sessions,
    active_seconds: Math.round(activeSeconds),
  };
}

function countSliceText(content) {
  if (!Array.isArray(content)) return 0;
  let n = 0;
  for (const node of content) {
    if (!node || typeof node !== 'object') continue;
    if (typeof node.text === 'string') n += node.text.length;
    else if (node.content) n += countSliceText(node.content);
  }
  return n;
}
