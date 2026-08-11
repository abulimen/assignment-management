import { describe, it, expect } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import BulletList from '@tiptap/extension-bullet-list';
import ListItem from '@tiptap/extension-list-item';
import History from '@tiptap/extension-history';
import { AuthorMark } from './AuthorMark';
import { AuthorOverride } from './AuthorOverride';

const LEADER = 2;
const MATE = 1;

// Simulate real typing: tr.insertText applies the marks active at the cursor,
// which is exactly the ProseMirror behavior that leaks a teammate's author
// mark onto the leader's new text.
function type(editor, pos, text) {
  editor.view.dispatch(editor.view.state.tr.insertText(text, pos, pos));
}

function collectTexts(node, out = []) {
  if (node.text !== undefined) out.push({ text: node.text, marks: node.marks || [] });
  (node.content || []).forEach(c => collectTexts(c, out));
  return out;
}

function authorOf(textNode) {
  const m = textNode.marks.find(mk => mk.type === 'author');
  return m ? m.attrs.authorId : null;
}

function makeEditor(content) {
  return new Editor({
    extensions: [
      Document,
      Paragraph,
      Text,
      Bold,
      BulletList,
      ListItem,
      History,
      AuthorMark,
      AuthorOverride.configure({ authorId: LEADER }),
    ],
    content,
  });
}

const matePara = {
  type: 'paragraph',
  content: [
    { type: 'text', text: 'mate text', marks: [{ type: 'author', attrs: { authorId: MATE } }] },
  ],
};

describe('AuthorOverride', () => {
  it('typing in an empty paragraph (inherited from a teammate section) gets the leader mark', () => {
    // doc: p("mate text") = 0..10, empty p = 10..12, inner pos 11
    const editor = makeEditor({ type: 'doc', content: [matePara, { type: 'paragraph' }] });
    type(editor, 11, 'hello');

    const texts = collectTexts(editor.getJSON());
    const typed = texts.find(t => t.text === 'hello');
    expect(typed).toBeTruthy();
    expect(authorOf(typed)).toBe(LEADER);
  });

  it('typing at the end of a teammate text gets the leader mark, teammate text keeps theirs', () => {
    // "mate text" spans 1..10; type right after it
    const editor = makeEditor({ type: 'doc', content: [matePara] });
    type(editor, 10, ' and mine');

    const texts = collectTexts(editor.getJSON());
    const mate = texts.find(t => t.text === 'mate text');
    const mine = texts.find(t => t.text === ' and mine');
    expect(authorOf(mate)).toBe(MATE);
    expect(authorOf(mine)).toBe(LEADER);
  });

  it('typing in the middle of teammate text splits ownership correctly', () => {
    const editor = makeEditor({ type: 'doc', content: [matePara] });
    type(editor, 5, 'XX');

    const texts = collectTexts(editor.getJSON());
    const inserted = texts.find(t => t.text === 'XX');
    expect(authorOf(inserted)).toBe(LEADER);
    // surrounding teammate text stays theirs
    texts.filter(t => t.text !== 'XX').forEach(t => expect(authorOf(t)).toBe(MATE));
  });

  it('typing after the leader own text keeps the leader mark', () => {
    const ownPara = {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'mine', marks: [{ type: 'author', attrs: { authorId: LEADER } }] },
      ],
    };
    const editor = makeEditor({ type: 'doc', content: [ownPara] });
    type(editor, 5, ' more');

    const texts = collectTexts(editor.getJSON());
    texts.forEach(t => expect(authorOf(t)).toBe(LEADER));
  });

  it('formatting teammate text (bold) does NOT re-attribute it', () => {
    const editor = makeEditor({ type: 'doc', content: [matePara] });
    editor.commands.setTextSelection({ from: 1, to: 10 });
    editor.commands.toggleBold();

    const texts = collectTexts(editor.getJSON());
    expect(texts).toHaveLength(1);
    expect(authorOf(texts[0])).toBe(MATE);
    expect(texts[0].marks.some(m => m.type === 'bold')).toBe(true);
  });

  it('wrapping teammate text in a bullet list does NOT re-attribute it', () => {
    const editor = makeEditor({ type: 'doc', content: [matePara] });
    editor.commands.setTextSelection(5);
    editor.commands.toggleBulletList();

    const texts = collectTexts(editor.getJSON());
    expect(texts).toHaveLength(1);
    expect(authorOf(texts[0])).toBe(MATE);
  });

  it('undo of a deletion restores teammate text with the ORIGINAL author mark', () => {
    const editor = makeEditor({ type: 'doc', content: [matePara] });
    editor.commands.setTextSelection({ from: 1, to: 10 });
    editor.commands.deleteSelection();
    expect(collectTexts(editor.getJSON())).toHaveLength(0);

    editor.commands.undo();
    const texts = collectTexts(editor.getJSON());
    expect(texts).toHaveLength(1);
    expect(authorOf(texts[0])).toBe(MATE);
  });

  it('undo of typing-over teammate text restores their mark, redo of leader typing keeps leader mark', () => {
    const editor = makeEditor({ type: 'doc', content: [matePara] });
    // leader selects the whole teammate text and types over it
    editor.view.dispatch(editor.view.state.tr.insertText('mine', 1, 10));
    expect(authorOf(collectTexts(editor.getJSON())[0])).toBe(LEADER);

    editor.commands.undo();
    const restored = collectTexts(editor.getJSON());
    expect(restored).toHaveLength(1);
    expect(authorOf(restored[0])).toBe(MATE);

    editor.commands.redo();
    const redone = collectTexts(editor.getJSON());
    expect(redone).toHaveLength(1);
    expect(authorOf(redone[0])).toBe(LEADER);
  });

  it('pressing Enter inside teammate text then typing attributes only new text to leader', () => {
    const editor = makeEditor({ type: 'doc', content: [matePara] });
    // split "mate text" after "mate " (pos 6)
    editor.view.dispatch(editor.view.state.tr.split(6));
    type(editor, 6, 'new');

    const texts = collectTexts(editor.getJSON());
    const inserted = texts.find(t => t.text === 'new');
    expect(authorOf(inserted)).toBe(LEADER);
    texts.filter(t => t.text !== 'new').forEach(t => expect(authorOf(t)).toBe(MATE));
  });
});
