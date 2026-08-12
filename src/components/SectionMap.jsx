import { useEffect, useState } from 'react';
import { TextSelection } from '@tiptap/pm/state';
import { ListTree, Plus } from 'lucide-react';
import { listSections } from '../utils/sectionDoc';

// Document outline: every section with its live editors, click to jump.
export default function SectionMap({ editor, presence = {}, onAddSection }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return undefined;
    const bump = () => setTick((t) => t + 1);
    editor.on('transaction', bump);
    return () => { editor.off('transaction', bump); };
  }, [editor]);

  if (!editor) return null;

  let sections = [];
  try {
    sections = listSections(editor.getJSON());
  } catch {
    sections = [];
  }

  function jumpTo(sectionId) {
    const doc = editor.state.doc;
    let offset = 0;
    let found = -1;
    doc.forEach((child) => {
      if (found === -1) {
        if (child.attrs.id === sectionId) found = offset;
        offset += child.nodeSize;
      }
    });
    if (found === -1) return;
    // Land at the start of the section's title.
    const tr = editor.state.tr.setSelection(
      TextSelection.near(editor.state.doc.resolve(found + 2)),
    ).scrollIntoView();
    editor.view.dispatch(tr);
    editor.view.focus();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ListTree className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Sections</h3>
        </div>
        {onAddSection && (
          <button onClick={onAddSection} title="Add a section"
            className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>
      <div className="space-y-1">
        {sections.map((s, i) => {
          const users = presence[s.id] || [];
          return (
            <button key={s.id} onClick={() => jumpTo(s.id)}
              className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-700 truncate">
                  {i + 1}. {s.title || <span className="text-gray-400">Untitled section</span>}
                </span>
                {users.length > 0 && (
                  <span className="flex items-center gap-1 flex-shrink-0">
                    {users.map((u, j) => (
                      <span key={j} className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color }}
                        title={`${u.name} is editing here`} />
                    ))}
                  </span>
                )}
              </div>
              {users.length > 0 && (
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                  {users.map((u) => u.name).join(', ')} editing
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
