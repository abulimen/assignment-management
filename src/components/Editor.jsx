import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
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

export default function Editor({ submissionId, initialContent, onContentChange }) {
  const { plugin, flush } = useTracker(submissionId);
  const registered = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing your assignment...' }),
    ],
    content: initialContent ? JSON.parse(initialContent) : null,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onContentChange?.(JSON.stringify(json));
    },
    onBlur: () => flush(),
  });

  useEffect(() => {
    if (editor && plugin && !registered.current) {
      editor.registerPlugin(plugin);
      registered.current = true;
    }
  }, [editor, plugin]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <Toolbar editor={editor} />
      <div className="min-h-[500px]">
        <EditorContent editor={editor} className="p-6" />
      </div>
    </div>
  );
}