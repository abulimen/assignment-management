import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { SectionDocument, Section, SectionTitle } from './Section';

// Headless editor with the Word-section document model.
function makeEditor(content) {
  const editor = new Editor({
    extensions: [
      SectionDocument,
      Section,
      SectionTitle,
      StarterKit.configure({ document: false }),
    ],
    content,
  });
  editors.push(editor);
  return editor;
}

const editors = [];
afterEach(() => {
  editors.forEach((e) => e.destroy());
  editors.length = 0;
});

function oneSectionDoc(id = 'sec-a', body = []) {
  return {
    type: 'doc',
    content: [
      {
        type: 'section',
        attrs: { id },
        content: [{ type: 'sectionTitle' }, { type: 'paragraph', content: body }],
      },
    ],
  };
}

function threeSections() {
  return {
    type: 'doc',
    content: ['sec-a', 'sec-b', 'sec-c'].map((id) => ({
      type: 'section',
      attrs: { id },
      content: [{ type: 'sectionTitle' }, { type: 'paragraph' }],
    })),
  };
}

const sectionIds = (editor) =>
  Array.from({ length: editor.state.doc.childCount }, (_, i) => editor.state.doc.child(i).attrs.id);

describe('Section document model', () => {
  it('a document is one or more sections, each starting with a title', () => {
    const editor = makeEditor(oneSectionDoc());
    const doc = editor.state.doc;
    expect(doc.type.name).toBe('doc');
    expect(doc.childCount).toBe(1);
    const section = doc.child(0);
    expect(section.type.name).toBe('section');
    expect(section.child(0).type.name).toBe('sectionTitle');
    expect(section.child(1).type.name).toBe('paragraph');
  });

  it('addSectionAfter inserts a new section after the current one and moves the caret into its title', () => {
    const editor = makeEditor(oneSectionDoc('sec-a'));
    editor.commands.focus('start');
    expect(editor.commands.addSectionAfter()).toBe(true);

    const doc = editor.state.doc;
    expect(doc.childCount).toBe(2);
    const ids = sectionIds(editor);
    expect(ids[0]).toBe('sec-a');
    expect(ids[1]).toBeTruthy();
    expect(ids[1]).not.toBe('sec-a');

    // Caret landed inside the NEW section's title.
    const $from = editor.state.selection.$from;
    const ancestors = [];
    for (let d = $from.depth; d > 0; d--) ancestors.push($from.node(d).type.name);
    expect(ancestors).toContain('sectionTitle');
    // The title belongs to the second section.
    const sectionAncestor = ancestors.indexOf('section');
    expect($from.node(sectionAncestor === -1 ? 1 : $from.depth - ancestors.indexOf('section') + 1)).toBeTruthy();
    expect($from.start() > doc.child(0).nodeSize).toBe(true);
  });

  it('deleteEmptySection refuses to delete the only section', () => {
    const editor = makeEditor(oneSectionDoc());
    editor.commands.focus('start');
    expect(editor.commands.deleteEmptySection()).toBe(false);
    expect(editor.state.doc.childCount).toBe(1);
  });

  it('deleteEmptySection refuses when the section has content', () => {
    const editor = makeEditor({
      type: 'doc',
      content: [
        {
          type: 'section',
          attrs: { id: 'sec-a' },
          content: [{ type: 'sectionTitle' }, { type: 'paragraph', content: [{ type: 'text', text: 'keep me' }] }],
        },
        {
          type: 'section',
          attrs: { id: 'sec-b' },
          content: [{ type: 'sectionTitle' }, { type: 'paragraph' }],
        },
      ],
    });
    // Caret inside the first (non-empty) section.
    editor.commands.focus(2);
    expect(editor.commands.deleteEmptySection()).toBe(false);
    expect(sectionIds(editor)).toEqual(['sec-a', 'sec-b']);
  });

  it('deleteEmptySection removes an empty section and moves the caret to the previous one', () => {
    const editor = makeEditor(threeSections());
    // Put the caret inside the LAST (empty) section's paragraph.
    const doc = editor.state.doc;
    const lastSectionStart = doc.child(0).nodeSize + doc.child(1).nodeSize;
    editor.commands.focus(lastSectionStart + 2);
    expect(editor.commands.deleteEmptySection()).toBe(true);
    expect(sectionIds(editor)).toEqual(['sec-a', 'sec-b']);
    // Caret now lives inside sec-b.
    const $from = editor.state.selection.$from;
    let inSection = null;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type.name === 'section') { inSection = $from.node(d); break; }
    }
    expect(inSection.attrs.id).toBe('sec-b');
  });

  it('moveSection reorders sections by index', () => {
    const editor = makeEditor(threeSections());
    expect(editor.commands.moveSection(0, 2)).toBe(true);
    expect(sectionIds(editor)).toEqual(['sec-b', 'sec-c', 'sec-a']);
  });

  it('moveSection rejects out-of-range and no-op moves', () => {
    const editor = makeEditor(threeSections());
    expect(editor.commands.moveSection(0, 5)).toBe(false);
    expect(editor.commands.moveSection(-1, 1)).toBe(false);
    expect(editor.commands.moveSection(1, 1)).toBe(false);
    expect(sectionIds(editor)).toEqual(['sec-a', 'sec-b', 'sec-c']);
  });

  it('exitSectionTitle moves the caret from the title into the section body', () => {
    const editor = makeEditor(oneSectionDoc());
    editor.commands.focus(2); // inside the title
    expect(editor.commands.exitSectionTitle()).toBe(true);
    const $from = editor.state.selection.$from;
    expect($from.parent.type.name).toBe('paragraph');
  });

  it('every created section carries a stable id attribute', () => {
    const editor = makeEditor(oneSectionDoc());
    editor.commands.focus('start');
    editor.commands.addSectionAfter();
    editor.commands.addSectionAfter();
    const ids = sectionIds(editor);
    expect(new Set(ids).size).toBe(3);
    ids.forEach((id) => expect(typeof id).toBe('string'));
  });
});
