import { useEffect, useState } from 'react';
import { TextSelection } from '@tiptap/pm/state';
import { ListTree, Plus, Layers, ChevronRight, Users, CheckCircle2 } from 'lucide-react';
import { listSections } from '../utils/sectionDoc';

// Interactive document outline & section navigator
export default function SectionMap({ editor, presence = {}, onAddSection }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return undefined;
    const bump = () => setTick((t) => t + 1);
    editor.on('transaction', bump);
    return () => {
      editor.off('transaction', bump);
    };
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
    const tr = editor.state.tr.setSelection(
      TextSelection.near(editor.state.doc.resolve(found + 2)),
    ).scrollIntoView();
    editor.view.dispatch(tr);
    editor.view.focus();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#0047FF]" />
          <h2 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-700">
            Document Outline ({sections.length})
          </h2>
        </div>
        {onAddSection && (
          <button
            onClick={onAddSection}
            title="Add a new section"
            className="inline-flex items-center gap-1 text-xs text-[#0047FF] hover:text-[#0038CC] font-bold font-mono px-2 py-0.5 rounded hover:bg-[#0047FF]/5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        )}
      </div>

      <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-0.5">
        {sections.map((s, i) => {
          const users = presence[s.id] || [];
          return (
            <button
              key={s.id}
              onClick={() => jumpTo(s.id)}
              className="w-full flex flex-col justify-center text-left p-2.5 rounded-lg border border-transparent hover:border-gray-200 hover:bg-[#F9F8F6] transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[11px] font-bold text-[#0047FF] bg-[#0047FF]/5 px-1.5 py-0.5 rounded shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs font-semibold text-[#1A1A1B] group-hover:text-[#0047FF] transition-colors truncate">
                    {s.title || <span className="text-gray-400 italic">Untitled section</span>}
                  </span>
                </div>

                {users.length > 0 && (
                  <span className="flex items-center -space-x-1 shrink-0">
                    {users.map((u, j) => (
                      <span
                        key={j}
                        className="w-3 h-3 rounded-full ring-2 ring-white inline-block"
                        style={{ backgroundColor: u.color }}
                        title={`${u.name} is typing in this section`}
                      />
                    ))}
                  </span>
                )}
              </div>

              {users.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-mono text-[#0047FF] mt-1 pl-7">
                  <Users className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{users.map((u) => u.name).join(', ')} active</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
