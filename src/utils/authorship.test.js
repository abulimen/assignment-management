import { describe, it, expect } from 'vitest';
import {
  extractDocText,
  buildAuthorColorMap,
  addAuthorMarks,
  AUTHOR_PALETTE,
} from './authorship';

const doc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'world', marks: [{ type: 'bold' }] },
      ],
    },
    { type: 'paragraph', content: [{ type: 'text', text: 'Second line' }] },
  ],
};

describe('extractDocText', () => {
  it('concatenates all text nodes', () => {
    expect(extractDocText(doc)).toBe('Hello world\nSecond line');
  });

  it('handles empty doc', () => {
    expect(extractDocText({ type: 'doc', content: [] })).toBe('');
    expect(extractDocText(null)).toBe('');
  });
});

describe('buildAuthorColorMap', () => {
  it('assigns distinct palette indices to each member', () => {
    const members = [{ student_id: 17 }, { student_id: 9 }, { student_id: 5 }];
    const map = buildAuthorColorMap(members);
    expect(map[17]).toBe(0);
    expect(map[9]).toBe(1);
    expect(map[5]).toBe(2);
  });

  it('has 8 distinct colors in palette', () => {
    expect(AUTHOR_PALETTE.length).toBe(8);
    expect(new Set(AUTHOR_PALETTE).size).toBe(8);
  });
});

describe('addAuthorMarks', () => {
  it('adds author mark to every text node', () => {
    const result = addAuthorMarks(doc, 17);
    const firstPara = result.content[0];
    expect(firstPara.content[0].marks).toContainEqual({ type: 'author', attrs: { authorId: 17 } });
    expect(firstPara.content[1].marks).toContainEqual({ type: 'author', attrs: { authorId: 17 } });
    const secondPara = result.content[1];
    expect(secondPara.content[0].marks).toContainEqual({ type: 'author', attrs: { authorId: 17 } });
  });

  it('preserves existing marks', () => {
    const result = addAuthorMarks(doc, 9);
    const boldNode = result.content[0].content[1];
    expect(boldNode.marks).toContainEqual({ type: 'bold' });
    expect(boldNode.marks).toContainEqual({ type: 'author', attrs: { authorId: 9 } });
  });

  it('does not mutate the input', () => {
    const before = JSON.stringify(doc);
    addAuthorMarks(doc, 17);
    expect(JSON.stringify(doc)).toBe(before);
  });

  it('handles text nodes without existing marks', () => {
    const result = addAuthorMarks(doc, 5);
    const plainNode = result.content[0].content[0];
    expect(plainNode.marks).toHaveLength(1);
    expect(plainNode.marks[0].type).toBe('author');
  });
});