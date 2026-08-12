// Pure helpers for the sectioned document model (TipTap JSON).
// Legacy flat documents are normalized into sections; sealed/review paths
// use the same helpers so old submissions keep rendering.

export function newSectionId() {
  return `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptySectionNode(id = newSectionId()) {
  return {
    type: 'section',
    attrs: { id },
    content: [{ type: 'sectionTitle' }, { type: 'paragraph' }],
  };
}

export function emptySectionedDoc() {
  return { type: 'doc', content: [emptySectionNode()] };
}

function sectionWithContent(blocks) {
  return {
    type: 'section',
    attrs: { id: newSectionId() },
    content: [{ type: 'sectionTitle' }, ...blocks],
  };
}

// Normalize any document JSON into the sectioned shape:
//  - empty/missing  -> one empty section
//  - fully sectioned -> unchanged
//  - flat or mixed  -> runs of loose blocks wrapped into new sections,
//                      existing sections passed through untouched
export function wrapFlatContent(docJson) {
  if (!docJson || docJson.type !== 'doc') return emptySectionedDoc();
  const content = Array.isArray(docJson.content) ? docJson.content : [];
  if (content.length === 0) return emptySectionedDoc();
  if (content.every((n) => n && n.type === 'section')) return docJson;

  const out = [];
  let run = [];
  const flush = () => {
    if (run.length) {
      out.push(sectionWithContent(run));
      run = [];
    }
  };
  for (const node of content) {
    if (node && node.type === 'section') {
      flush();
      out.push(node);
    } else {
      run.push(node);
    }
  }
  flush();
  return { type: 'doc', content: out };
}

function extractInlineText(node) {
  if (!node) return '';
  if (typeof node.text === 'string') return node.text;
  return (node.content || []).map(extractInlineText).join('');
}

// Ordered list of { id, title } for outlines and navigation.
export function listSections(docJson) {
  const content = (docJson && Array.isArray(docJson.content)) ? docJson.content : [];
  return content
    .filter((n) => n && n.type === 'section')
    .map((s) => ({ id: s.attrs?.id ?? null, title: extractInlineText(s.content?.[0]) }));
}

// Compute the {from, to} indices for a drag-and-drop reorder, matching the
// splice semantics of the moveSection command (remove at `from`, land at
// index `to`). Returns null for a no-op or unknown ids.
export function planSectionMove(ids, draggedId, targetId, place) {
  const from = ids.indexOf(draggedId);
  if (from === -1 || ids.indexOf(targetId) === -1) return null;
  const reduced = ids.filter((id) => id !== draggedId);
  const reducedTarget = reduced.indexOf(targetId);
  if (reducedTarget === -1) return null;
  const to = place === 'after' ? reducedTarget + 1 : reducedTarget;
  if (to === from) return null;
  return { from, to };
}
