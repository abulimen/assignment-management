// Minimum match length to treat a fragment as externally pasted — shorter
// matches ("the", "and then") would be false positives.
export const MIN_PASTE_MATCH = 25;

// Return a NEW doc JSON with a `pasted` mark on text spans that match the
// given member's externally-pasted strings (pastedByAuthor: {authorId: [str]}).
// Only text carrying that member's author mark is considered. Pure.
// Walks to any depth (sectioned docs nest text several levels down).
export function annotatePasted(docJson, pastedByAuthor) {
  if (!docJson || !docJson.content) return docJson;
  return {
    ...docJson,
    content: docJson.content.flatMap(node => annotateDeep(node, pastedByAuthor)),
  };
}

function annotateDeep(node, pastedByAuthor) {
  if (node.text !== undefined) return annotateText(node, pastedByAuthor);
  if (!node.content) return [node];
  return [{
    ...node,
    content: node.content.flatMap(child => annotateDeep(child, pastedByAuthor)),
  }];
}

function annotateText(node, pastedByAuthor) {
  if (node.text === undefined) return [node];
  // Author-keyed pasted lists; '*' is the fallback for docs without author
  // marks (an individual member's section).
  const authorMark = (node.marks || []).find(m => m.type === 'author');
  const key = authorMark ? String(authorMark.attrs.authorId) : '*';

  const pasted = pastedByAuthor[key] || [];
  const ranges = matchRanges(node.text, pasted);
  if (ranges.length === 0) return [node];
  return splitByRanges(node, ranges);
}

function matchRanges(text, pastedStrings) {
  const ranges = [];
  for (const p of pastedStrings) {
    if (p.length < MIN_PASTE_MATCH) continue;
    if (text.length >= MIN_PASTE_MATCH && p.includes(text)) {
      // Whole node is inside a pasted block (node may have been split by edits)
      ranges.push([0, text.length]);
    } else {
      // Pasted block sits inside this node
      const idx = text.indexOf(p);
      if (idx >= 0) ranges.push([idx, idx + p.length]);
    }
  }
  return mergeRanges(ranges);
}

function mergeRanges(ranges) {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out = [[...sorted[0]]];
  for (const [f, t] of sorted.slice(1)) {
    const last = out[out.length - 1];
    if (f <= last[1]) last[1] = Math.max(last[1], t);
    else out.push([f, t]);
  }
  return out;
}

// Return a NEW doc JSON with all `pasted` marks removed (used before saving
// a merged doc so the display-only overlay never persists into the artifact).
export function stripPastedMarks(docJson) {
  if (!docJson || !docJson.content) return docJson;
  return {
    ...docJson,
    content: docJson.content.map(node => ({
      ...node,
      content: (node.content || []).map(t => {
        if (t.text === undefined) return t;
        const marks = (t.marks || []).filter(m => m.type !== 'pasted');
        return { ...t, marks: marks.length ? marks : undefined };
      }),
    })),
  };
}

function splitByRanges(node, ranges) {
  const parts = [];
  let pos = 0;
  const push = (from, to, pasted) => {
    if (to <= from) return;
    const marks = [...(node.marks || [])];
    if (pasted) marks.push({ type: 'pasted' });
    parts.push({ ...node, text: node.text.slice(from, to), marks });
  };
  for (const [f, t] of ranges) {
    push(pos, f, false);
    push(f, t, true);
    pos = t;
  }
  push(pos, node.text.length, false);
  return parts;
}
