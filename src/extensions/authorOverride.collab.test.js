import { describe, it, expect, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import History from '@tiptap/extension-history';
import { AuthorMark } from './AuthorMark';
import { AuthorOverride } from './AuthorOverride';

const LEADER = 2;
const MATE = 1;

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
  const editor = new Editor({
    extensions: [Document, Paragraph, Text, History, AuthorMark, AuthorOverride.configure({ authorId: LEADER })],
    content,
  });
  editors.push(editor);
  return editor;
}

// Dispose editors so ProseMirror's DOMObserver timers don't outlive jsdom.
const editors = [];
afterEach(() => {
  editors.forEach(e => e.destroy());
  editors.length = 0;
});

const matePara = {
  type: 'paragraph',
  content: [
    { type: 'text', text: 'mate text', marks: [{ type: 'author', attrs: { authorId: MATE } }] },
  ],
};

describe('AuthorOverride in collaborative mode', () => {
  it('does NOT re-stamp text inserted by a remote peer sync transaction', () => {
    const editor = makeEditor({ type: 'doc', content: [matePara] });

    // Simulate y-prosemirror applying a remote peer's edit: the transaction
    // inserts text carrying the PEER's author mark and carries y-sync meta.
    const peerMark = editor.schema.marks.author.create({ authorId: 99 });
    const tr = editor.view.state.tr.insertText('remote words', 10, 10);
    tr.addMark(10, 10 + 'remote words'.length, peerMark);
    tr.setMeta('y-sync', { isChangeOrigin: true });
    editor.view.dispatch(tr);

    const texts = collectTexts(editor.getJSON());
    const remote = texts.find(t => t.text === 'remote words');
    expect(remote).toBeTruthy();
    // Must keep the peer's mark (99), NOT be restamped to LEADER.
    expect(authorOf(remote)).toBe(99);
    // Mate's text untouched.
    expect(authorOf(texts.find(t => t.text === 'mate text'))).toBe(MATE);
  });

  it('still re-stamps genuine local typing', () => {
    const editor = makeEditor({ type: 'doc', content: [matePara] });
    editor.view.dispatch(editor.view.state.tr.insertText(' mine', 10, 10));
    const texts = collectTexts(editor.getJSON());
    expect(authorOf(texts.find(t => t.text === ' mine'))).toBe(LEADER);
  });
});
