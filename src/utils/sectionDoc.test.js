import { describe, it, expect } from 'vitest';
import { wrapFlatContent, emptySectionedDoc, listSections, planSectionMove } from './sectionDoc';

const flat = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'legacy work' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'more legacy' }] },
  ],
};

describe('wrapFlatContent — legacy normalization', () => {
  it('wraps flat legacy content into a single section', () => {
    const out = wrapFlatContent(flat);
    expect(out.type).toBe('doc');
    expect(out.content).toHaveLength(1);
    const section = out.content[0];
    expect(section.type).toBe('section');
    expect(section.attrs.id).toBeTruthy();
    expect(section.content[0].type).toBe('sectionTitle');
    // Original paragraphs preserved in order after the title.
    expect(section.content.slice(1)).toEqual(flat.content);
  });

  it('passes through documents that are already fully sectioned', () => {
    const sectioned = {
      type: 'doc',
      content: [
        { type: 'section', attrs: { id: 'a' }, content: [{ type: 'sectionTitle' }, { type: 'paragraph' }] },
        { type: 'section', attrs: { id: 'b' }, content: [{ type: 'sectionTitle' }, { type: 'paragraph' }] },
      ],
    };
    expect(wrapFlatContent(sectioned)).toEqual(sectioned);
  });

  it('wraps only the loose blocks in a mixed document, keeping existing sections intact', () => {
    const mixed = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'orphan before' }] },
        { type: 'section', attrs: { id: 'kept' }, content: [{ type: 'sectionTitle' }, { type: 'paragraph' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'orphan after' }] },
      ],
    };
    const out = wrapFlatContent(mixed);
    expect(out.content.map((n) => n.type)).toEqual(['section', 'section', 'section']);
    expect(out.content[1].attrs.id).toBe('kept');
    expect(out.content[0].content.slice(1)).toEqual([mixed.content[0]]);
    expect(out.content[2].content.slice(1)).toEqual([mixed.content[2]]);
  });

  it('seeds empty or missing documents with one empty section', () => {
    for (const input of [null, undefined, { type: 'doc' }, { type: 'doc', content: [] }]) {
      const out = wrapFlatContent(input);
      expect(out.content).toHaveLength(1);
      expect(out.content[0].type).toBe('section');
      expect(out.content[0].content[0].type).toBe('sectionTitle');
      expect(out.content[0].content[1].type).toBe('paragraph');
    }
  });

  it('never nests sections inside sections', () => {
    const out = wrapFlatContent(flat);
    const walk = (node) => {
      if (node.type === 'section') {
        for (const child of node.content || []) expect(child.type).not.toBe('section');
      }
      (node.content || []).forEach(walk);
    };
    walk(out);
  });
});

describe('emptySectionedDoc / listSections', () => {
  it('emptySectionedDoc produces unique section ids', () => {
    const a = emptySectionedDoc();
    const b = emptySectionedDoc();
    expect(a.content[0].attrs.id).not.toBe(b.content[0].attrs.id);
  });

  it('listSections extracts ids and title text in order', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'section',
          attrs: { id: 's1' },
          content: [
            { type: 'sectionTitle', content: [{ type: 'text', text: 'Introduction' }] },
            { type: 'paragraph' },
          ],
        },
        { type: 'section', attrs: { id: 's2' }, content: [{ type: 'sectionTitle' }, { type: 'paragraph' }] },
      ],
    };
    expect(listSections(doc)).toEqual([
      { id: 's1', title: 'Introduction' },
      { id: 's2', title: '' },
    ]);
  });
});

describe('planSectionMove — drag-and-drop target computation', () => {
  const ids = ['intro', 'methods', 'results'];

  it('drag first section after the last', () => {
    expect(planSectionMove(ids, 'intro', 'results', 'after')).toEqual({ from: 0, to: 2 });
  });

  it('drag last section before the first', () => {
    expect(planSectionMove(ids, 'results', 'intro', 'before')).toEqual({ from: 2, to: 0 });
  });

  it('drag middle section before the first', () => {
    expect(planSectionMove(ids, 'methods', 'intro', 'before')).toEqual({ from: 1, to: 0 });
  });

  it('drag middle section after the last', () => {
    expect(planSectionMove(ids, 'methods', 'results', 'after')).toEqual({ from: 1, to: 2 });
  });

  it('dropping a section on its own position is a no-op', () => {
    expect(planSectionMove(ids, 'methods', 'intro', 'after')).toBeNull(); // lands back at index 1
    expect(planSectionMove(ids, 'methods', 'results', 'before')).toBeNull();
    expect(planSectionMove(ids, 'methods', 'methods', 'before')).toBeNull();
  });

  it('rejects unknown ids', () => {
    expect(planSectionMove(ids, 'nope', 'intro', 'before')).toBeNull();
    expect(planSectionMove(ids, 'intro', 'nope', 'before')).toBeNull();
  });
});
