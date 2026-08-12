// Headless export of a shared Y.Doc — the Node server is the only component
// that can read Yjs state, so PHP asks it for canonical JSON, HTML, the
// content hash, and the per-author surviving-character rollup.
import { createHash } from 'node:crypto';
import { yDocToProsemirrorJSON } from 'y-prosemirror';
import { generateHTML } from '@tiptap/html';
import { Mark, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';

// TipTap's Collaboration extension binds the document to the 'default' field.
export const TIPTAP_FIELD = 'default';

// Mirror of frontend src/extensions/AuthorMark.js. Kept in sync by hand:
// this package uses its own @tiptap/core instance, so the module cannot
// be shared across the Node/browser boundary.
const AuthorMark = Mark.create({
  name: 'author',
  addAttributes() {
    return {
      authorId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-author'),
        renderHTML: (attributes) => ({ 'data-author': attributes.authorId }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-author]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'author-highlight author-' + HTMLAttributes['data-author'] }),
      0,
    ];
  },
});

// Mirrors of frontend src/extensions/Section.js (same hand-sync rule).
const SectionTitle = Node.create({
  name: 'sectionTitle',
  content: 'inline*',
  group: 'block',
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-section-title]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-section-title': 'true' }), 0];
  },
});

const Section = Node.create({
  name: 'section',
  group: 'block',
  content: 'sectionTitle block+',
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-section-id'),
        renderHTML: (attributes) => ({ 'data-section-id': attributes.id }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'section[data-section-id]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes), ['div', { class: 'section-body' }, 0]];
  },
});

// Same content extensions the frontend editor uses (minus UI-only ones).
const exportExtensions = [
  StarterKit,
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Link.configure({ openOnClick: false }),
  AuthorMark,
  SectionTitle,
  Section,
];

export function docToProseMirrorJSON(ydoc) {
  return normalizeRoot(yDocToProsemirrorJSON(ydoc, TIPTAP_FIELD));
}

// A Y.Doc edited through TipTap always has block structure, but defensively
// normalize the export so it never yields a doc the TipTap schema can't
// render: y-prosemirror can emit nested arrays for bare text runs, and bare
// inline content at the doc root is invalid — wrap it in paragraphs.
function normalizeRoot(json) {
  const flatten = (items) => {
    const flat = [];
    for (const item of items) {
      if (Array.isArray(item)) flat.push(...flatten(item));
      else if (item && typeof item === 'object') flat.push(item);
    }
    return flat;
  };

  const blocks = [];
  let inlineRun = [];
  const flush = () => {
    if (inlineRun.length) blocks.push({ type: 'paragraph', content: inlineRun });
    inlineRun = [];
  };
  for (const node of flatten(json?.content || [])) {
    if (node.type === 'text') inlineRun.push(node);
    else {
      flush();
      blocks.push(node);
    }
  }
  flush();
  if (blocks.length === 0) blocks.push({ type: 'paragraph' });
  return { type: 'doc', content: blocks };
}

// Canonical content hash: sha256 over the exported ProseMirror JSON.
// Deterministic for identical content regardless of edit history/tombstones.
export function docContentSha256(ydoc) {
  return createHash('sha256').update(JSON.stringify(docToProseMirrorJSON(ydoc))).digest('hex');
}

export function docToHTML(prosemirrorJson) {
  return generateHTML(prosemirrorJson, exportExtensions);
}

// Surviving text per author: walk the exported doc, sum text lengths by the
// author mark. Deleted text is gone from the fragment and scores zero —
// contribution is what the group kept, not what was typed.
export function survivingCharsByAuthor(prosemirrorJson) {
  const counts = {};
  const walk = (node) => {
    if (!node) return;
    if (typeof node.text === 'string') {
      const authorMark = (node.marks || []).find((m) => m.type === 'author');
      const key = authorMark ? String(authorMark.attrs?.authorId ?? 'unknown') : 'unattributed';
      counts[key] = (counts[key] || 0) + node.text.length;
      return;
    }
    (node.content || []).forEach(walk);
  };
  walk(prosemirrorJson);
  return counts;
}

// Plain text (for word counts).
export function docToPlainText(prosemirrorJson) {
  const parts = [];
  const walk = (node) => {
    if (!node) return;
    if (typeof node.text === 'string') {
      parts.push(node.text);
      return;
    }
    (node.content || []).forEach(walk);
    if (['paragraph', 'heading', 'blockquote', 'listItem'].includes(node.type)) parts.push('\n');
  };
  walk(prosemirrorJson);
  return parts.join('');
}
