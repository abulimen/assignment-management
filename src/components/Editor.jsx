import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { Plus } from 'lucide-react';
import { AuthorMark } from '../extensions/AuthorMark';
import { SectionDocument, Section, SectionTitle } from '../extensions/Section';
import { useTracker } from '../hooks/useTracker';
import WordRibbon from './WordRibbon';
import WordStatusBar from './WordStatusBar';
import { useEffect, useRef } from 'react';

// The Word-style editor used everywhere: solo drafts, the realtime group
// document, and read-only review views. The document model is sectioned
// (doc = section+); each section renders as one page-like sheet.
export default function Editor({
  submissionId,
  initialContent,
  onContentChange,
  editable = true,
  extraExtensions = [],
  collab = null,
  statusBarExtra = null,
  onReady = null,
}) {
  const { flush, captureTransaction, setEditorRef, enqueue } = useTracker(submissionId);
  const pendingPasteRef = useRef(null);

  // Collaborative mode (Yjs/Hocuspocus): content lives in the shared Y.Doc,
  // undo/redo is Yjs-managed (StarterKit history off), remote peers' cursors
  // render via CollaborationCursor. The tracker still runs: it filters remote
  // transactions and captures only local input.
  const extensions = collab
    ? [
        SectionDocument,
        Section,
        SectionTitle,
        StarterKit.configure({ document: false, history: false }),
        Collaboration.configure({ document: collab.ydoc, field: 'default' }),
        CollaborationCursor.configure({ provider: collab.provider, user: collab.user }),
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Link.configure({ openOnClick: false }),
        AuthorMark,
        ...extraExtensions,
      ]
    : [
        SectionDocument,
        Section,
        SectionTitle,
        StarterKit.configure({ document: false }),
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Link.configure({ openOnClick: false }),
        ...extraExtensions,
      ];

  const editor = useEditor({
    extensions,
    ...(collab ? {} : { content: initialContent ? JSON.parse(initialContent) : undefined }),
    editable,
    editorProps: {
      attributes: {
        class: 'word-document',
      },
      handlePaste: (view, event) => {
        // Capture clipboard text before ProseMirror processes it
        const clipboardText = event.clipboardData?.getData('text/plain') || '';
        if (clipboardText.length > 0) {
          pendingPasteRef.current = {
            text: clipboardText,
            timestamp: Date.now(),
            isHtml: event.clipboardData?.types?.includes('text/html'),
          };
        }
        // Don't return true — let ProseMirror handle the paste normally
      },
    },
    onUpdate: ({ editor, transaction }) => {
      const json = editor.getJSON();
      onContentChange?.(JSON.stringify(json));
      // Skip tracking when read-only
      if (!editable) return;
      captureTransaction(transaction, pendingPasteRef.current);
      if (pendingPasteRef.current) {
        pendingPasteRef.current = null;
      }
    },
    onBlur: () => { if (editable) flush(); },
  });

  // Give the tracker access to the editor for snapshots
  useEffect(() => {
    setEditorRef(() => editor);
  }, [editor, setEditorRef]);

  // Expose the editor instance to the page (section map, presence chips).
  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAddSection() {
    editor?.chain().focus('end').addSectionAfter().run();
  }

  // Focus/blur tracking for active time calculation (skip when read-only)
  useEffect(() => {
    if (!enqueue || !editable) return;

    const handleFocus = () => {
      enqueue('focus', { timestamp: Date.now() / 1000 });
    };
    const handleBlur = () => {
      enqueue('blur', { timestamp: Date.now() / 1000 });
    };
    const handleVisibility = () => {
      if (document.hidden) handleBlur();
      else handleFocus();
    };

    handleFocus();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      handleBlur();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enqueue, editable]);

  return (
    <div className={`word-editor${editable ? '' : ' word-editor-readonly'}`}>
      <WordRibbon editor={editor} editable={editable} />
      <div className="word-canvas">
        <div className="word-sheet-wrap">
          <EditorContent editor={editor} />
          {editable && (
            <button type="button" className="word-add-section" onClick={handleAddSection}>
              <Plus className="w-4 h-4" /> Add Section
            </button>
          )}
        </div>
      </div>
      <WordStatusBar editor={editor} editable={editable}>
        {statusBarExtra}
      </WordStatusBar>
    </div>
  );
}
