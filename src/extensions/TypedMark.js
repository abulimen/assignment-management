import { Mark } from '@tiptap/core';

// Marks text originally typed directly by the student in the editor.
// Rendered as a subtle green highlight so original writing is visible.
export const TypedMark = Mark.create({
  name: 'typed',

  parseHTML() {
    return [{ tag: 'span[data-typed]' }];
  },

  renderHTML() {
    return ['span', { 'data-typed': 'true', class: 'typed-highlight' }, 0];
  },
});
