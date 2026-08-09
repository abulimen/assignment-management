// Authorship utilities for group work.
// Pure functions — unit tested in authorship.test.js.

// 8 distinct colors for author highlighting (cycled by member index).
export const AUTHOR_PALETTE = [
  'rgba(59, 130, 246, 0.30)',  // blue
  'rgba(34, 197, 94, 0.30)',   // green
  'rgba(168, 85, 247, 0.30)',  // purple
  'rgba(249, 115, 22, 0.30)',  // orange
  'rgba(236, 72, 153, 0.30)',  // pink
  'rgba(14, 165, 233, 0.30)',  // sky
  'rgba(234, 179, 8, 0.30)',   // yellow
  'rgba(20, 184, 166, 0.30)',  // teal
];

// Extract plain text from a TipTap doc JSON (walks content[].content[].text).
export function extractDocText(docJson) {
  if (!docJson || !docJson.content) return '';
  const lines = [];
  for (const node of docJson.content) {
    lines.push(extractNodeText(node));
  }
  return lines.join('\n');
}

function extractNodeText(node) {
  if (!node) return '';
  if (node.text) return node.text;
  if (!node.content) return '';
  return node.content.map(extractNodeText).join('');
}

// Map each member (by student_id) to a distinct palette index, in order.
export function buildAuthorColorMap(members) {
  const map = {};
  (members || []).forEach((m, i) => {
    map[m.student_id] = i % AUTHOR_PALETTE.length;
  });
  return map;
}

// Return a NEW doc JSON with an `author` mark added to every text node.
// Preserves existing marks. Does not mutate the input.
export function addAuthorMarks(docJson, authorId) {
  if (!docJson) return docJson;
  return {
    ...docJson,
    content: (docJson.content || []).map(node => addMarksToNode(node, authorId)),
  };
}

function addMarksToNode(node, authorId) {
  const authorMark = { type: 'author', attrs: { authorId } };
  const result = { ...node };

  if (node.text !== undefined) {
    // Text node: prepend author mark, keep existing marks.
    result.marks = [authorMark, ...(node.marks || [])];
  }

  if (node.content) {
    result.content = node.content.map(child => addMarksToNode(child, authorId));
  }
  return result;
}