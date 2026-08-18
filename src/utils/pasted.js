// Minimum match length to treat a fragment as externally pasted — shorter
// matches ("the", "and then") would be false positives.
export const MIN_PASTE_MATCH = 25;

// Return a NEW doc JSON with a `pasted` mark on text spans that match the
// given member's externally-pasted strings (pastedByAuthor: {authorId: [str]}).
// If markTyped is true, text spans NOT matching pasted text receive a `typed` mark.
export function annotatePasted(docJson, pastedByAuthor, markTyped = false) {
  if (!docJson || !docJson.content) return docJson;
  return {
    ...docJson,
    content: docJson.content.flatMap(node => annotateDeep(node, pastedByAuthor, markTyped)),
  };
}

function annotateDeep(node, pastedByAuthor, markTyped = false) {
  if (node.text !== undefined) return annotateText(node, pastedByAuthor, markTyped);
  if (!node.content) return [node];
  return [{
    ...node,
    content: node.content.flatMap(child => annotateDeep(child, pastedByAuthor, markTyped)),
  }];
}

function annotateText(node, pastedByAuthor, markTyped = false) {
  if (node.text === undefined) return [node];
  // Author-keyed pasted lists; '*' is the fallback for docs without author
  // marks (an individual member's section).
  const authorMark = (node.marks || []).find(m => m.type === 'author');
  const key = authorMark ? String(authorMark.attrs.authorId) : '*';

  const pasted = pastedByAuthor[key] || [];
  const ranges = matchRanges(node.text, pasted);
  if (ranges.length === 0) {
    if (!markTyped) return [node];
    // Mark entire node as typed if not pasted
    const marks = [...(node.marks || []).filter(m => m.type !== 'pasted' && m.type !== 'typed'), { type: 'typed' }];
    return [{ ...node, marks }];
  }
  return splitByRanges(node, ranges, markTyped);
}

function matchRanges(text, pastedStrings) {
  const ranges = [];
  for (const p of pastedStrings) {
    if (!p || typeof p !== 'string' || p.length < MIN_PASTE_MATCH) continue;
    if (text.length >= MIN_PASTE_MATCH && p.includes(text)) {
      // Whole node is inside a pasted block
      ranges.push([0, text.length]);
    } else {
      // Pasted block sits inside this node
      let startIdx = 0;
      while (startIdx < text.length) {
        const idx = text.indexOf(p, startIdx);
        if (idx === -1) break;
        ranges.push([idx, idx + p.length]);
        startIdx = idx + p.length;
      }

      // If no exact match and paste is long, use 25-char window chunks to catch edited pastes
      if (ranges.length === 0 && p.length >= 25 && text.length >= 25) {
        const chunkSize = 25;
        for (let i = 0; i <= p.length - chunkSize; i += 12) {
          const chunk = p.slice(i, i + chunkSize);
          let cIdx = 0;
          while (cIdx < text.length) {
            const found = text.indexOf(chunk, cIdx);
            if (found === -1) break;
            ranges.push([found, found + chunkSize]);
            cIdx = found + chunkSize;
          }
        }
      }
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

// Return a NEW doc JSON with all `pasted` and `typed` marks removed
export function stripPastedMarks(docJson) {
  if (!docJson || !docJson.content) return docJson;
  return {
    ...docJson,
    content: docJson.content.map(node => ({
      ...node,
      content: (node.content || []).map(t => {
        if (t.text === undefined) return t;
        const marks = (t.marks || []).filter(m => m.type !== 'pasted' && m.type !== 'typed');
        return { ...t, marks: marks.length ? marks : undefined };
      }),
    })),
  };
}

function splitByRanges(node, ranges, markTyped = false) {
  const parts = [];
  let pos = 0;
  const push = (from, to, pasted) => {
    if (to <= from) return;
    const baseMarks = (node.marks || []).filter(m => m.type !== 'pasted' && m.type !== 'typed');
    const marks = [...baseMarks];
    if (pasted) {
      marks.push({ type: 'pasted' });
    } else if (markTyped) {
      marks.push({ type: 'typed' });
    }
    parts.push({ ...node, text: node.text.slice(from, to), marks: marks.length ? marks : undefined });
  };
  for (const [f, t] of ranges) {
    push(pos, f, false);
    push(f, t, true);
    pos = t;
  }
  push(pos, node.text.length, false);
  return parts;
}
