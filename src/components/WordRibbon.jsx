import { useEffect, useState } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Link2,
  Heading1,
  Heading2,
  Heading3,
  Maximize2,
  Minimize2,
  Eraser,
} from 'lucide-react';

function ActionButton({ icon: Icon, label, active = false, disabled = false, onClick, shortcut }) {
  return (
    <button
      type="button"
      className={`relative inline-flex items-center justify-center w-8 h-8 sm:w-8 sm:h-8 rounded-lg text-xs transition-all duration-150 cursor-pointer shrink-0 ${
        active
          ? 'bg-[#0047FF]/10 text-[#0047FF] font-bold ring-1 ring-[#0047FF]/20 shadow-xs'
          : 'text-gray-600 hover:text-[#1A1A1B] hover:bg-gray-100'
      } ${disabled ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}`}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

export default function WordRibbon({ editor, editable = true, onToggleFocus, isFocus = false }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return undefined;
    const update = () => setTick((t) => t + 1);
    editor.on('transaction', update);
    return () => {
      editor.off('transaction', update);
    };
  }, [editor]);

  if (!editor || !editable) return null;

  const chain = () => editor.chain().focus();

  function setLink() {
    if (editor.isActive('link')) {
      chain().unsetLink().run();
      return;
    }
    const url = window.prompt('Enter link URL (https://...):');
    if (url) chain().extendMarkRange('link').setLink({ href: url }).run();
  }

  function clearFormatting() {
    chain().unsetAllMarks().clearNodes().run();
  }

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20 transition-all shadow-xs select-none">
      <div className="flex items-center justify-between px-2 sm:px-3 py-1.5 overflow-x-auto scrollbar-none gap-1 sm:gap-2">
        {/* Left: Text Style Selector */}
        <div className="flex items-center gap-1 shrink-0 pr-1.5 border-r border-gray-200">
          <button
            type="button"
            onClick={() => chain().setParagraph().run()}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 ${
              editor.isActive('paragraph') && !editor.isActive('heading')
                ? 'bg-gray-100 text-[#1A1A1B] font-bold shadow-xs'
                : 'text-gray-500 hover:bg-gray-50 hover:text-[#1A1A1B]'
            }`}
            title="Normal Paragraph"
          >
            Normal
          </button>
          <ActionButton
            icon={Heading1}
            label="Heading 1"
            shortcut="Ctrl+Alt+1"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => chain().toggleHeading({ level: 1 }).run()}
          />
          <ActionButton
            icon={Heading2}
            label="Heading 2"
            shortcut="Ctrl+Alt+2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => chain().toggleHeading({ level: 2 }).run()}
          />
          <ActionButton
            icon={Heading3}
            label="Heading 3"
            shortcut="Ctrl+Alt+3"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => chain().toggleHeading({ level: 3 }).run()}
          />
        </div>

        {/* Center: Character Styles */}
        <div className="flex items-center gap-0.5 shrink-0 px-1 border-r border-gray-200">
          <ActionButton
            icon={Bold}
            label="Bold"
            shortcut="Ctrl+B"
            active={editor.isActive('bold')}
            onClick={() => chain().toggleBold().run()}
          />
          <ActionButton
            icon={Italic}
            label="Italic"
            shortcut="Ctrl+I"
            active={editor.isActive('italic')}
            onClick={() => chain().toggleItalic().run()}
          />
          <ActionButton
            icon={UnderlineIcon}
            label="Underline"
            shortcut="Ctrl+U"
            active={editor.isActive('underline')}
            onClick={() => chain().toggleUnderline().run()}
          />
          <ActionButton
            icon={Strikethrough}
            label="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => chain().toggleStrike().run()}
          />
          <ActionButton
            icon={Code}
            label="Inline Code"
            active={editor.isActive('code')}
            onClick={() => chain().toggleCode().run()}
          />
        </div>

        {/* Paragraph Structures */}
        <div className="flex items-center gap-0.5 shrink-0 px-1 border-r border-gray-200">
          <ActionButton
            icon={List}
            label="Bullet List"
            active={editor.isActive('bulletList')}
            onClick={() => chain().toggleBulletList().run()}
          />
          <ActionButton
            icon={ListOrdered}
            label="Numbered List"
            active={editor.isActive('orderedList')}
            onClick={() => chain().toggleOrderedList().run()}
          />
          <ActionButton
            icon={Quote}
            label="Blockquote"
            active={editor.isActive('blockquote')}
            onClick={() => chain().toggleBlockquote().run()}
          />
        </div>

        {/* Links & Clear */}
        <div className="flex items-center gap-0.5 shrink-0 px-1">
          <ActionButton
            icon={Link2}
            label="Insert Link"
            active={editor.isActive('link')}
            onClick={setLink}
          />
          <ActionButton
            icon={Eraser}
            label="Clear Formatting"
            onClick={clearFormatting}
          />
        </div>

        {/* Undo/Redo & Fullscreen (Desktop) */}
        <div className="flex items-center gap-0.5 shrink-0 pl-1 border-l border-gray-200">
          <ActionButton
            icon={Undo2}
            label="Undo"
            shortcut="Ctrl+Z"
            disabled={!editor.can().undo()}
            onClick={() => chain().undo().run()}
          />
          <ActionButton
            icon={Redo2}
            label="Redo"
            shortcut="Ctrl+Y"
            disabled={!editor.can().redo()}
            onClick={() => chain().redo().run()}
          />
          {onToggleFocus && (
            <button
              type="button"
              onClick={onToggleFocus}
              className={`hidden sm:inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs transition-colors cursor-pointer ${
                isFocus
                  ? 'bg-[#0047FF] text-white'
                  : 'text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-100'
              }`}
              title={isFocus ? 'Exit Focus Mode' : 'Enter Focus Mode'}
            >
              {isFocus ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
