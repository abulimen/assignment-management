import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { AuthorMark } from '../extensions/AuthorMark';
import { useTracker } from '../hooks/useTracker';
import { useEffect, useRef } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code, Undo, Redo,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2
} from 'lucide-react';

function Toolbar({ editor }) {
  if (!editor) return null;

  const buttons = [
    { group: 'headings', items: [
      { action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), icon: <Heading1 className="w-4 h-4" />, label: 'H1' },
      { action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), icon: <Heading2 className="w-4 h-4" />, label: 'H2' },
    ]},
    { group: 'inline', items: [
      { action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), icon: <Bold className="w-4 h-4" />, label: 'Bold' },
      { action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), icon: <Italic className="w-4 h-4" />, label: 'Italic' },
      { action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), icon: <UnderlineIcon className="w-4 h-4" />, label: 'Underline' },
      { action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), icon: <Strikethrough className="w-4 h-4" />, label: 'Strikethrough' },
      { action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code'), icon: <Code className="w-4 h-4" />, label: 'Code' },
    ]},
    { group: 'blocks', items: [
      { action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), icon: <List className="w-4 h-4" />, label: 'Bullet List' },
      { action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), icon: <ListOrdered className="w-4 h-4" />, label: 'Numbered List' },
      { action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), icon: <Quote className="w-4 h-4" />, label: 'Quote' },
    ]},
    { group: 'align', items: [
      { action: () => editor.chain().focus().setTextAlign('left').run(), active: editor.isActive({ textAlign: 'left' }), icon: <AlignLeft className="w-4 h-4" />, label: 'Left' },
      { action: () => editor.chain().focus().setTextAlign('center').run(), active: editor.isActive({ textAlign: 'center' }), icon: <AlignCenter className="w-4 h-4" />, label: 'Center' },
      { action: () => editor.chain().focus().setTextAlign('right').run(), active: editor.isActive({ textAlign: 'right' }), icon: <AlignRight className="w-4 h-4" />, label: 'Right' },
    ]},
  ];

  return (
    <div className="border-b border-gray-200 bg-white sticky top-16 z-10">
      <div className="flex items-center gap-1 p-2 flex-wrap">
        {buttons.map(group => (
          <div key={group.group} className="flex items-center gap-0.5">
            {group.items.map(btn => (
              <button key={btn.label} onClick={btn.action}
                className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${btn.active ? 'bg-gray-100 text-primary-600' : 'text-gray-600'}`}
                title={btn.label}>
                {btn.icon}
              </button>
            ))}
            <div className="w-px h-5 bg-gray-200 mx-1" />
          </div>
        ))}
        <button onClick={() => editor.chain().focus().undo().run()} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Undo"><Undo className="w-4 h-4" /></button>
        <button onClick={() => editor.chain().focus().redo().run()} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Redo"><Redo className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export default function Editor({ submissionId, initialContent, onContentChange, editable = true, extraExtensions = [], collab = null }) {
  const { flush, captureTransaction, setEditorRef, enqueue } = useTracker(submissionId);
  const registered = useRef(false);
  const pendingPasteRef = useRef(null);

  // Collaborative mode (Yjs/Hocuspocus): document content lives in the shared
  // Y.Doc, undo/redo is Yjs-managed (StarterKit history off), and remote
  // peers' cursors are rendered via CollaborationCursor. The tracker still
  // runs — it filters remote transactions and captures only local input.
  const extensions = collab
    ? [
        StarterKit.configure({ history: false }),
        Collaboration.configure({ document: collab.ydoc, field: 'default' }),
        CollaborationCursor.configure({ provider: collab.provider, user: collab.user }),
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: 'Start writing together...' }),
        AuthorMark,
        ...extraExtensions,
      ]
    : [
        StarterKit,
        Underline,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: 'Start writing your assignment...' }),
        ...extraExtensions,
      ];

  const editor = useEditor({
    extensions,
    ...(collab ? {} : { content: initialContent ? JSON.parse(initialContent) : null }),
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
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
      // Pass the pending paste info (if any) to the tracker
      captureTransaction(transaction, pendingPasteRef.current);
      // Clear the pending paste after it's been consumed
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

    // Emit initial focus when editor mounts
    handleFocus();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      handleBlur(); // Emit blur on unmount
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enqueue, editable]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {editable && <Toolbar editor={editor} />}
      <div className="min-h-[500px]">
        <EditorContent editor={editor} className="p-6" />
      </div>
    </div>
  );
}