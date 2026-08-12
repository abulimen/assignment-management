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
  if (typeof node.text === 'string') return node.text;
  if (Array.isArray(node.content)) {
    let text = '';
    for (const child of node.content) text += extractNodeText(child);
    return text;
  }
  return '';
}

export function extractPlainText(doc) {
  let text = '';
  if (!doc || !Array.isArray(doc.content)) return text;
  for (const node of doc.content) {
    text += extractNodeText(node) + '\n';
  }
  return text;
}

// PHP str_word_count default: ASCII letter sequences count as words.
export function strWordCount(text) {
  const m = String(text).match(/[A-Za-z]+/g);
  return m ? m.length : 0;
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
