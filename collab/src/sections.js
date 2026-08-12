// Section structure for shared Y.Documents.
//
// The document model is doc = section+. Two guarantees live here:
//  - brand-new documents are seeded with one empty section (so clients never
//    race to create the first one), and
//  - legacy flat documents from the pre-sections era are migrated on load by
//    wrapping loose blocks into sections (existing sections pass through).
//
// Yjs 13 cannot re-insert already-integrated items (moves crash), so the
// migration rebuilds via clone + delete + insert — the same delete+insert-new
// pattern y-prosemirror uses when the frontend reorders sections. Migration
// runs before any client syncs, so fresh item identity is safe, and clones
// preserve content, attributes, and formatting.
import * as Y from 'yjs';
import { TIPTAP_FIELD } from './export.js';

function newSectionId() {
  return `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeEmptySection(id = newSectionId()) {
  const section = new Y.XmlElement('section');
  section.setAttribute('id', id);
  const title = new Y.XmlElement('sectionTitle');
  const para = new Y.XmlElement('paragraph');
  section.insert(0, [title, para]);
  return section;
}

const isSectionEl = (el) => el instanceof Y.XmlElement && el.nodeName === 'section';

// Returns true when the document was changed (seeded or migrated).
export function migrateDocToSections(doc) {
  const frag = doc.getXmlFragment(TIPTAP_FIELD);
  const children = frag.toArray();

  if (children.length === 0) {
    frag.insert(0, [makeEmptySection()]);
    return true;
  }
  if (children.every(isSectionEl)) return false;

  // Index runs of loose (non-section) children.
  const runs = [];
  let start = -1;
  children.forEach((child, i) => {
    if (!isSectionEl(child) && start === -1) start = i;
    if (isSectionEl(child) && start !== -1) {
      runs.push([start, i - 1]);
      start = -1;
    }
  });
  if (start !== -1) runs.push([start, children.length - 1]);

  // Right-to-left so earlier indices stay valid while we splice.
  for (let r = runs.length - 1; r >= 0; r--) {
    const [runStart, runEnd] = runs[r];
    const clones = [];
    for (let i = runStart; i <= runEnd; i++) clones.push(frag.get(i).clone());

    const section = makeEmptySection();
    section.delete(1, 1); // drop the seed paragraph; clones follow the title
    section.insert(1, clones);

    frag.delete(runStart, runEnd - runStart + 1);
    frag.insert(runStart, [section]);
  }
  return true;
}
