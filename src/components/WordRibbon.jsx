import { useEffect, useState } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  AlignLeft, AlignCenter, AlignRight, List, ListOrdered, Quote,
  Undo2, Redo2, Link2, Unlink, Plus,
} from 'lucide-react';

// Word-style ribbon: tabs (Home / Insert) over grouped controls with small
// group labels. Drives an existing TipTap editor instance.

function IconButton({ icon: Icon, label, active = false, disabled = false, onClick }) {
  return (
    <button type="button" className={`word-btn${active ? ' active' : ''}`} title={label}
      aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}>
      <Icon className="w-4 h-4" />
    </button>
  );
}

export default function WordRibbon({ editor, editable = true }) {
  const [tab, setTab] = useState('home');
  const [, setTick] = useState(0);

  // Re-render on every transaction so active states stay honest.
  useEffect(() => {
    if (!editor) return undefined;
    const update = () => setTick((t) => t + 1);
    editor.on('transaction', update);
    return () => { editor.off('transaction', update); };
  }, [editor]);

  if (!editor || !editable) return null;

  const chain = () => editor.chain().focus();

  function setLink() {
    if (editor.isActive('link')) {
      chain().unsetLink().run();
      return;
    }
    const url = window.prompt('Link URL (https://...)');
    if (url) chain().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div className="word-ribbon">
      <div className="word-ribbon-tabs" role="tablist">
        {['home', 'insert'].map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t}
            className={`word-ribbon-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}>
            {t === 'home' ? 'Home' : 'Insert'}
          </button>
        ))}
      </div>

      {tab === 'home' && (
        <div className="word-ribbon-body">
          <div className="word-ribbon-group">
            <div className="word-ribbon-controls">
              <button type="button"
                className={`word-style-btn${editor.isActive('paragraph') && !editor.isActive('heading') ? ' active' : ''}`}
                onClick={() => chain().setParagraph().run()} title="Normal">
                <span className="preview preview-normal">Aa</span>
                <span className="name">Normal</span>
              </button>
              <button type="button"
                className={`word-style-btn${editor.isActive('heading', { level: 1 }) ? ' active' : ''}`}
                onClick={() => chain().toggleHeading({ level: 1 }).run()} title="Heading 1">
                <span className="preview preview-h1">Aa</span>
                <span className="name">Heading 1</span>
              </button>
              <button type="button"
                className={`word-style-btn${editor.isActive('heading', { level: 2 }) ? ' active' : ''}`}
                onClick={() => chain().toggleHeading({ level: 2 }).run()} title="Heading 2">
                <span className="preview preview-h2">Aa</span>
                <span className="name">Heading 2</span>
              </button>
            </div>
            <div className="word-ribbon-label">Styles</div>
          </div>

          <div className="word-ribbon-group">
            <div className="word-ribbon-controls">
              <IconButton icon={Bold} label="Bold (Ctrl+B)" active={editor.isActive('bold')} onClick={() => chain().toggleBold().run()} />
              <IconButton icon={Italic} label="Italic (Ctrl+I)" active={editor.isActive('italic')} onClick={() => chain().toggleItalic().run()} />
              <IconButton icon={UnderlineIcon} label="Underline (Ctrl+U)" active={editor.isActive('underline')} onClick={() => chain().toggleUnderline().run()} />
              <IconButton icon={Strikethrough} label="Strikethrough" active={editor.isActive('strike')} onClick={() => chain().toggleStrike().run()} />
              <IconButton icon={Code} label="Code" active={editor.isActive('code')} onClick={() => chain().toggleCode().run()} />
            </div>
            <div className="word-ribbon-label">Font</div>
          </div>

          <div className="word-ribbon-group">
            <div className="word-ribbon-controls">
              <IconButton icon={AlignLeft} label="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => chain().setTextAlign('left').run()} />
              <IconButton icon={AlignCenter} label="Center" active={editor.isActive({ textAlign: 'center' })} onClick={() => chain().setTextAlign('center').run()} />
              <IconButton icon={AlignRight} label="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => chain().setTextAlign('right').run()} />
              <IconButton icon={List} label="Bulleted list" active={editor.isActive('bulletList')} onClick={() => chain().toggleBulletList().run()} />
              <IconButton icon={ListOrdered} label="Numbered list" active={editor.isActive('orderedList')} onClick={() => chain().toggleOrderedList().run()} />
              <IconButton icon={Quote} label="Quote" active={editor.isActive('blockquote')} onClick={() => chain().toggleBlockquote().run()} />
            </div>
            <div className="word-ribbon-label">Paragraph</div>
          </div>

          <div className="word-ribbon-group">
            <div className="word-ribbon-controls">
              <IconButton icon={Undo2} label="Undo (Ctrl+Z)" onClick={() => chain().undo().run()} />
              <IconButton icon={Redo2} label="Redo (Ctrl+Y)" onClick={() => chain().redo().run()} />
            </div>
            <div className="word-ribbon-label">Editing</div>
          </div>
        </div>
      )}

      {tab === 'insert' && (
        <div className="word-ribbon-body">
          <div className="word-ribbon-group">
            <div className="word-ribbon-controls">
              <button type="button" className="word-new-section" onClick={() => chain().addSectionAfter().run()}
                title="Insert a new section (Ctrl+Enter)">
                <Plus className="w-3.5 h-3.5" /> New Section
              </button>
            </div>
            <div className="word-ribbon-label">Sections</div>
          </div>

          <div className="word-ribbon-group">
            <div className="word-ribbon-controls">
              {editor.isActive('link')
                ? <IconButton icon={Unlink} label="Remove link" onClick={setLink} />
                : <IconButton icon={Link2} label="Insert link" onClick={setLink} />}
            </div>
            <div className="word-ribbon-label">Links</div>
          </div>
        </div>
      )}
    </div>
  );
}
