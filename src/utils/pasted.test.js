import { describe, it, expect } from 'vitest';
import { annotatePasted, stripPastedMarks } from './pasted';

const author = id => [{ type: 'author', attrs: { authorId: id } }];
const PASTED = { type: 'pasted' };

function textNode(text, marks) {
  return { type: 'text', text, marks };
}

function texts(doc) {
  return doc.content.flatMap(n => (n.content || []).map(t => t));
}

const LONG_PASTE = 'Providing data on students writing process and time spent on Google Docs to verify student effort.';

describe('annotatePasted', () => {
  it('marks the whole node when its text is contained in a pasted string', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [textNode('Providing data on students writing process', author(9))] },
      ],
    };
    const out = annotatePasted(doc, { 9: [LONG_PASTE] });
    const [t] = texts(out);
    expect(t.marks).toContainEqual(PASTED);
    expect(t.marks).toContainEqual(author(9)[0]);
  });

  it('splits the node when a pasted string is contained in its text', () => {
    const typed = 'Intro. ';
    const nodeText = typed + LONG_PASTE + ' End.';
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [textNode(nodeText, author(9))] }],
    };
    const out = annotatePasted(doc, { 9: [LONG_PASTE] });
    const ts = texts(out);
    expect(ts).toHaveLength(3);
    expect(ts[0].text).toBe(typed);
    expect(ts[0].marks).not.toContainEqual(PASTED);
    expect(ts[1].text).toBe(LONG_PASTE);
    expect(ts[1].marks).toContainEqual(PASTED);
    expect(ts[2].text).toBe(' End.');
    expect(ts[2].marks).not.toContainEqual(PASTED);
  });

  it('ignores short matches to avoid false positives', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [textNode('the quick brown fox', author(9))] }],
    };
    const out = annotatePasted(doc, { 9: ['the quick brown fox jumps over'] });
    const [t] = texts(out);
    expect(t.marks).not.toContainEqual(PASTED);
  });

  it('only matches text authored by the same member', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [textNode('Providing data on students writing process', author(17))] },
      ],
    };
    const out = annotatePasted(doc, { 9: [LONG_PASTE] });
    const [t] = texts(out);
    expect(t.marks).not.toContainEqual(PASTED);
  });

  it('leaves nodes without author marks untouched', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [textNode(LONG_PASTE, [])] }],
    };
    const out = annotatePasted(doc, { 9: [LONG_PASTE] });
    const [t] = texts(out);
    expect(t.marks).not.toContainEqual(PASTED);
  });

  it('does not mutate the input', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [textNode(LONG_PASTE, author(9))] }],
    };
    annotatePasted(doc, { 9: [LONG_PASTE] });
    expect(doc.content[0].content[0].marks).toEqual(author(9));
  });

  it('marks text in docs without author marks via the * fallback (individual sections)', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [textNode(LONG_PASTE, [])] }],
    };
    const out = annotatePasted(doc, { '*': [LONG_PASTE] });
    const [t] = texts(out);
    expect(t.marks).toContainEqual(PASTED);
  });

  it('a node with an author mark ignores the * fallback list', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [textNode(LONG_PASTE, author(9))] }],
    };
    const out = annotatePasted(doc, { '*': [LONG_PASTE] });
    const [t] = texts(out);
    expect(t.marks).not.toContainEqual(PASTED);
  });
});

describe('stripPastedMarks', () => {
  it('removes pasted marks and keeps other marks', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [textNode(LONG_PASTE, [...author(9), PASTED])] },
      ],
    };
    const out = stripPastedMarks(doc);
    const [t] = texts(out);
    expect(t.marks).not.toContainEqual(PASTED);
    expect(t.marks).toContainEqual(author(9)[0]);
  });

  it('does not mutate the input', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [textNode(LONG_PASTE, [...author(9), PASTED])] }],
    };
    stripPastedMarks(doc);
    expect(doc.content[0].content[0].marks).toEqual([...author(9), PASTED]);
  });
});
