import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { SectionDocument, Section, SectionTitle } from '../extensions/Section';
import { sectionPresenceFromStates } from './sectionPresence';

// Two sections with known positions:
//   doc > section#s1 [ sectionTitle | paragraph('alpha text') ]
//       > section#s2 [ sectionTitle | paragraph ]
function makeEditor() {
  const editor = new Editor({
    extensions: [
      SectionDocument,
      Section,
      SectionTitle,
      StarterKit.configure({ document: false }),
    ],
    content: {
      type: 'doc',
      content: [
        {
          type: 'section',
          attrs: { id: 's1' },
          content: [
            { type: 'sectionTitle' },
            { type: 'paragraph', content: [{ type: 'text', text: 'alpha text' }] },
          ],
        },
        {
          type: 'section',
          attrs: { id: 's2' },
          content: [{ type: 'sectionTitle' }, { type: 'paragraph' }],
        },
      ],
    },
  });
  editors.push(editor);
  return editor;
}

const editors = [];
afterEach(() => {
  editors.forEach((e) => e.destroy());
  editors.length = 0;
});

// Position helpers against the real doc.
const posInSection = (editor, sectionIndex, extra = 0) => {
  const doc = editor.state.doc;
  let offset = 0;
  for (let i = 0; i < sectionIndex; i++) offset += doc.child(i).nodeSize;
  return offset + 2 + extra; // inside the section's title start (+1 for node open)
};

const state = (name, anchor, color = '#f00') => ({
  user: { name, color },
  cursor: anchor == null ? null : { anchor, head: anchor },
});

describe('sectionPresenceFromStates', () => {
  it('maps remote cursors to the section containing them', () => {
    const editor = makeEditor();
    const bySection = sectionPresenceFromStates(editor.state.doc, [
      { clientID: 2, state: state('Sarah', posInSection(editor, 0)) },
      { clientID: 3, state: state('David', posInSection(editor, 1)) },
    ], 1);
    expect(bySection.s1.map((u) => u.name)).toEqual(['Sarah']);
    expect(bySection.s2.map((u) => u.name)).toEqual(['David']);
  });

  it('groups several users in the same section, in clientID order', () => {
    const editor = makeEditor();
    const bySection = sectionPresenceFromStates(editor.state.doc, [
      { clientID: 3, state: state('David', posInSection(editor, 0)) },
      { clientID: 2, state: state('Sarah', posInSection(editor, 0, 3)) },
    ], 1);
    expect(bySection.s1.map((u) => u.name)).toEqual(['Sarah', 'David']);
  });

  it('excludes the local client', () => {
    const editor = makeEditor();
    const bySection = sectionPresenceFromStates(editor.state.doc, [
      { clientID: 1, state: state('Me', posInSection(editor, 0)) },
      { clientID: 2, state: state('Sarah', posInSection(editor, 0)) },
    ], 1);
    expect(bySection.s1.map((u) => u.name)).toEqual(['Sarah']);
  });

  it('ignores users without cursors and states without users', () => {
    const editor = makeEditor();
    const bySection = sectionPresenceFromStates(editor.state.doc, [
      { clientID: 2, state: state('Idle', null) },
      { clientID: 3, state: {} },
      { clientID: 4, state: state('Sarah', posInSection(editor, 1)) },
    ], 1);
    expect(Object.keys(bySection)).toEqual(['s2']);
  });

  it('survives stale positions from lagging peers', () => {
    const editor = makeEditor();
    const bySection = sectionPresenceFromStates(editor.state.doc, [
      { clientID: 2, state: state('Ghost', 99999) }, // far beyond doc size
      { clientID: 3, state: state('Sarah', posInSection(editor, 0)) },
    ], 1);
    expect(bySection.s1.map((u) => u.name)).toEqual(['Sarah']);
    expect(bySection.s2).toBeUndefined();
  });

  it('carries cursor color through for chip rendering', () => {
    const editor = makeEditor();
    const bySection = sectionPresenceFromStates(editor.state.doc, [
      { clientID: 2, state: state('Sarah', posInSection(editor, 0), '#123456') },
    ], 1);
    expect(bySection.s1[0].color).toBe('#123456');
  });
});
