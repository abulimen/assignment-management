// Plain-text helpers shared by the api and collab services (ProseMirror JSON
// walking + word counting). Single source of truth; api/src/text.js re-exports.

export function countSliceTextLength(content) {
  let len = 0;
  for (const node of content || []) {
    if (node && typeof node.text === 'string') {
      len += node.text.length;
    } else if (node && Array.isArray(node.content)) {
      len += countSliceTextLength(node.content);
    }
  }
  return len;
}

export function extractNodeText(node) {
  if (!node) return '';
  if (node.type === 'sectionTitle') return '';
  if (typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) {
    let text = '';
    for (const child of node.content) text += extractNodeText(child);
    return text;
  }
  return '';
}

export function extractPlainText(doc) {
  if (!doc) return '';
  const blocks = [];
  function walk(node) {
    if (!node) return;
    if (node.type === 'sectionTitle') return;
    if (typeof node.text === 'string') {
      blocks.push(node.text);
      return;
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child);
      if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'section' || node.type === 'blockquote' || node.type === 'listItem' || node.type === 'codeBlock') {
        blocks.push('\n');
      }
    }
  }
  walk(doc);
  return blocks.join('');
}

// Standard word counting matching TipTap / ProseMirror textContent.
export function strWordCount(text) {
  const trimmed = String(text || '').trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

// PHP round(v, decimals) — half away from zero, like PHP's round().
export function round(value, decimals = 0) {
  const factor = 10 ** decimals;
  const sign = value < 0 ? -1 : 1;
  return Math.round((Math.abs(value) + Number.EPSILON) * factor) / factor * sign;
}

// Word counting for group submissions: strip text nodes, then match
// /[\p{L}\p{N}'\-]+/u (matches group_submit.php).
export function stripTagsAndJsonText(json) {
  const doc = JSON.parse(json);
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.text !== undefined) { out.push(node.text); return; }
    for (const child of node.content || []) walk(child);
  };
  walk(doc);
  return out.join(' ');
}

export function countGroupWords(json) {
  const text = stripTagsAndJsonText(json);
  const m = text.match(/[\p{L}\p{N}'\-]+/gu);
  return m ? m.length : 0;
}
