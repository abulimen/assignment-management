import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';
import { isRemoteSyncTransaction } from '../utils/yjsMeta';

// In the merged group editor, ProseMirror's default typing behavior makes new
// text inherit the marks at the cursor — so typing next to (or in an empty
// paragraph carried over from) a teammate's section would wrongly stamp the
// leader's keystrokes with the teammate's author mark.
//
// This plugin re-stamps every INSERTED text range with the configured
// authorId, so ownership always reflects who actually typed/pasted it.
// Formatting-only steps (bold, headings, lists) never insert text and are
// left alone, and undo/redo restores are skipped so original marks survive.
export const AuthorOverride = Extension.create({
  name: 'authorOverride',

  addOptions() {
    return { authorId: null };
  },

  addProseMirrorPlugins() {
    const { authorId } = this.options;

    return [
      new Plugin({
        key: new PluginKey('authorOverride'),
        appendTransaction(transactions, oldState, newState) {
          if (authorId == null) return null;
          if (!transactions.some(tr => tr.docChanged)) return null;
          // Programmatic transactions excluded from history don't re-stamp.
          if (transactions.every(tr => tr.getMeta('addToHistory') === false)) return null;
          // Collaborative mode: remote peer syncs (and Yjs undo/redo) already
          // carry correct authorship from their origin — re-stamping would
          // steal ownership of a teammate's keystrokes.
          if (transactions.some(isRemoteSyncTransaction)) return null;
          // Undo/redo transactions carry metadata under the history plugin's
          // key (they do NOT set addToHistory:false). They restore text with
          // its original marks — re-stamping would steal ownership back.
          const historyPlugin = oldState.plugins.find(
            p => typeof p.key === 'string' && p.key.indexOf('history') === 0
          );
          if (historyPlugin && transactions.some(tr => tr.getMeta(historyPlugin.key) != null)) {
            return null;
          }

          const markType = newState.schema.marks.author;
          if (!markType) return null;

          // Collect inserted ranges (in newState coordinates).
          const ranges = [];
          for (const tr of transactions) {
            if (!tr.docChanged) continue;
            tr.steps.forEach((step, i) => {
              // Only plain replacements insert new text. ReplaceAroundStep
              // (wrap in list/heading/quote) only moves existing text inside
              // inserted wrappers — re-stamping it would steal ownership.
              if (!(step instanceof ReplaceStep) || step.slice.size === 0) return;
              step.getMap().forEach((_oldFrom, _oldTo, newFrom, newTo) => {
                if (newTo <= newFrom) return;
                const m = tr.mapping.slice(i + 1);
                ranges.push([m.map(newFrom), m.map(newTo)]);
              });
            });
          }
          if (ranges.length === 0) return null;

          const tr = newState.tr.setMeta('authorOverride', true);
          const mark = markType.create({ authorId });
          for (const [from, to] of ranges) {
            // addToSet replaces any existing author mark in the range.
            tr.addMark(from, to, mark);
          }
          return tr;
        },
      }),
    ];
  },
});
