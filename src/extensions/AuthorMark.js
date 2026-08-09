import { Mark, mergeAttributes } from '@tiptap/core';

// Custom TipTap Mark that embeds authorship in the merged document.
// Each text node authored by a member carries an `author` mark with `authorId`.
// ProseMirror preserves marks through edits, so ownership survives the
// leader's re-formatting. Rendered as a colored <span class="author-{id}">.
export const AuthorMark = Mark.create({
  name: 'author',

  addAttributes() {
    return {
      authorId: {
        default: null,
        parseHTML: element => element.getAttribute('data-author'),
        renderHTML: attributes => ({ 'data-author': attributes.authorId }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-author]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'author-highlight author-' + HTMLAttributes.authorId,
      }),
      0,
    ];
  },
});