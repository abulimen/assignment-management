import { Mark } from '@tiptap/core';

// Marks text pasted from an external source. Rendered as a bright red
// highlight nested inside the author-color span so both show at once.
export const PastedMark = Mark.create({
  name: 'pasted',

  parseHTML() {
    return [{ tag: 'span[data-pasted]' }];
  },

  renderHTML() {
    return ['span', { 'data-pasted': 'true', class: 'pasted-highlight' }, 0];
  },
});
