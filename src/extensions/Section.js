import { Node, mergeAttributes } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';
import { newSectionId, planSectionMove } from '../utils/sectionDoc';

// The Word-style document model: a document is one or more SECTIONS, and each
// section renders as its own page-like sheet. Students create, rename,
// reorder, and delete sections themselves; realtime sync treats a section as
// one Yjs subtree, so reordering is a clean move between peers.

// Custom top node: only sections may live at the document root.
export const SectionDocument = Node.create({
  name: 'doc',
  topNode: true,
  content: 'section+',
});

export const SectionTitle = Node.create({
  name: 'sectionTitle',
  content: 'inline*',
  group: 'block',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-section-title]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-section-title': 'true' }), 0];
  },

  addCommands() {
    return {
      // Enter in the title jumps into the section body instead of splitting
      // the title (schema guarantees at least one body block after it).
      exitSectionTitle: () => ({ state, dispatch }) => {
        const $from = state.selection.$from;
        let sectionDepth = -1;
        let inTitle = false;
        for (let d = $from.depth; d > 0; d--) {
          const name = $from.node(d).type.name;
          if (name === 'sectionTitle') inTitle = true;
          if (name === 'section') { sectionDepth = d; break; }
        }
        if (sectionDepth === -1 || !inTitle) return false;
        const section = $from.node(sectionDepth);
        const bodyPos = $from.start(sectionDepth) + section.child(0).nodeSize;
        if (dispatch) {
          dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(bodyPos))).scrollIntoView());
        }
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.exitSectionTitle(),
    };
  },
});

export const Section = Node.create({
  name: 'section',
  group: 'block',
  content: 'sectionTitle block+',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-section-id'),
        renderHTML: (attributes) => ({ 'data-section-id': attributes.id }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-section-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['section', mergeAttributes(HTMLAttributes), ['div', { class: 'section-body' }, 0]];
  },

  // Live chrome: drag handle for reordering + a portal mount for presence
  // chips. The section element is the node DOM; ProseMirror manages the
  // children inside .section-body only.
  addNodeView() {
    return (props) => new SectionNodeView(props);
  },

  addCommands() {
    const findSectionDepth = (state) => {
      const $from = state.selection.$from;
      for (let d = $from.depth; d > 0; d--) {
        if ($from.node(d).type.name === 'section') return d;
      }
      return -1;
    };

    const sectionIndexAt = (doc, pos) => {
      let offset = 0;
      for (let i = 0; i < doc.childCount; i++) {
        if (offset === pos) return i;
        offset += doc.child(i).nodeSize;
      }
      return -1;
    };

    const isEmptySection = (section) =>
      section.textContent.trim() === '' && section.childCount <= 2;

    return {
      // Insert a fresh section after the one holding the caret and move the
      // caret into its title. This is "make space for my work" without ever
      // typing inside someone else's text.
      addSectionAfter: () => ({ state, dispatch }) => {
        const sectionDepth = findSectionDepth(state);
        if (sectionDepth === -1) return false;
        const { section, sectionTitle, paragraph } = state.schema.nodes;
        const newSection = section.create({ id: newSectionId() }, [
          sectionTitle.create(),
          paragraph.create(),
        ]);
        const insertPos = state.selection.$from.after(sectionDepth);
        if (dispatch) {
          const tr = state.tr.insert(insertPos, newSection);
          // New section content starts at insertPos+1; its title's first
          // text position is insertPos+2.
          tr.setSelection(TextSelection.create(tr.doc, insertPos + 2)).scrollIntoView();
          dispatch(tr);
        }
        return true;
      },

      // Delete the section holding the caret, but only when it is empty and
      // not the last one. Content is never destroyed by this command.
      deleteEmptySection: () => ({ state, dispatch }) => {
        const sectionDepth = findSectionDepth(state);
        if (sectionDepth === -1) return false;
        const doc = state.doc;
        if (doc.childCount <= 1) return false;
        const section = state.selection.$from.node(sectionDepth);
        if (!isEmptySection(section)) return false;

        const sectionStart = state.selection.$from.before(sectionDepth);
        const index = sectionIndexAt(doc, sectionStart);
        if (index === -1) return false;

        if (dispatch) {
          const tr = state.tr.delete(sectionStart, sectionStart + section.nodeSize);
          // Land at the end of the previous section (or start of the next).
          const targetPos = index > 0 ? sectionStart - 1 : sectionStart;
          tr.setSelection(TextSelection.near(tr.doc.resolve(targetPos)));
          dispatch(tr.scrollIntoView());
        }
        return true;
      },

      // Reorder sections by index (drag-and-drop uses this). Semantics match
      // splice: remove at `from`, insert so the node lands at index `to`.
      moveSection: (from, to) => ({ state, dispatch }) => {
        const doc = state.doc;
        if (!Number.isInteger(from) || !Number.isInteger(to)) return false;
        if (from === to) return false;
        if (from < 0 || from >= doc.childCount || to < 0 || to >= doc.childCount) return false;

        if (dispatch) {
          const node = doc.child(from);
          let offset = 0;
          for (let i = 0; i < from; i++) offset += doc.child(i).nodeSize;

          let tr = state.tr.delete(offset, offset + node.nodeSize);
          let insertAt = 0;
          for (let i = 0; i < to && i < tr.doc.childCount; i++) {
            insertAt += tr.doc.child(i).nodeSize;
          }
          tr = tr.insert(insertAt, node);
          dispatch(tr);
        }
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Word's page-break muscle memory: a brand-new section.
      'Mod-Enter': () => this.editor.commands.addSectionAfter(),
      // Backspace at the very start of an empty section removes it.
      Backspace: () => {
        const { state } = this.editor;
        if (!state.selection.empty) return false;
        const $from = state.selection.$from;
        let sectionDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === 'section') { sectionDepth = d; break; }
        }
        if (sectionDepth === -1) return false;
        if ($from.pos !== $from.start(sectionDepth)) return false;
        return this.editor.commands.deleteEmptySection();
      },
    };
  },
});

class SectionNodeView {
  constructor({ node, editor }) {
    this.editor = editor;

    const dom = document.createElement('section');
    dom.setAttribute('data-section-id', node.attrs.id);

    const handle = document.createElement('div');
    handle.className = 'section-drag-handle';
    handle.title = 'Drag to reorder this section';
    handle.draggable = true;
    handle.textContent = '⠿';

    const chips = document.createElement('div');
    chips.className = 'section-chips';

    const body = document.createElement('div');
    body.className = 'section-body';

    dom.append(handle, chips, body);
    this.dom = dom;
    this.contentDOM = body;

    handle.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/section-id', dom.getAttribute('data-section-id'));
      dom.classList.add('section-dragging');
    });
    handle.addEventListener('dragend', () => {
      dom.classList.remove('section-dragging');
    });

    dom.addEventListener('dragover', (e) => {
      if (!Array.from(e.dataTransfer.types).includes('text/section-id')) return;
      e.preventDefault();
      const rect = dom.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      dom.classList.toggle('section-drop-before', before);
      dom.classList.toggle('section-drop-after', !before);
    });
    dom.addEventListener('dragleave', (e) => {
      if (!dom.contains(e.relatedTarget)) {
        dom.classList.remove('section-drop-before', 'section-drop-after');
      }
    });
    dom.addEventListener('drop', (e) => {
      e.preventDefault();
      dom.classList.remove('section-drop-before', 'section-drop-after');
      const draggedId = e.dataTransfer.getData('text/section-id');
      const targetId = dom.getAttribute('data-section-id');
      if (!draggedId || draggedId === targetId) return;
      const rect = dom.getBoundingClientRect();
      const place = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

      const ids = [];
      this.editor.state.doc.forEach((child) => ids.push(child.attrs.id));
      const plan = planSectionMove(ids, draggedId, targetId, place);
      if (plan) this.editor.commands.moveSection(plan.from, plan.to);
    });
  }

  update(node) {
    if (node.type.name !== 'section') return false;
    this.dom.setAttribute('data-section-id', node.attrs.id);
    return true;
  }
}
