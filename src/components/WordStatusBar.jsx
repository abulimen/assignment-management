import { useEffect, useState } from 'react';
import { Clock, FileText } from 'lucide-react';

// Word-style status bar: section position, word count, character count, reading time
export default function WordStatusBar({ editor, editable = true, children }) {
  const [info, setInfo] = useState({ words: 0, chars: 0, sections: 0, current: 0 });

  useEffect(() => {
    if (!editor) return undefined;
    const update = () => {
      const doc = editor.state.doc;
      const text = (doc.textBetween ? doc.textBetween(0, doc.content.size, '\n', '\n') : doc.textContent).trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const chars = text ? text.length : 0;
      let current = doc.childCount;
      const pos = editor.state.selection.$from.pos;
      let offset = 0;
      for (let i = 0; i < doc.childCount; i++) {
        offset += doc.child(i).nodeSize;
        if (pos < offset) { current = i + 1; break; }
      }
      setInfo({ words, chars, sections: doc.childCount, current });
    };
    update();
    editor.on('transaction', update);
    return () => { editor.off('transaction', update); };
  }, [editor]);

  const readingTime = Math.max(1, Math.ceil(info.words / 225));

  return (
    <div className="word-statusbar select-none">
      <div className="flex items-center gap-3">
        {editable ? (
          <span className="font-medium">Page {info.current} of {info.sections}</span>
        ) : (
          <span className="font-medium">Final submission · Read-only</span>
        )}
        <span className="text-gray-300 hidden sm:inline">|</span>
        <span className="text-gray-500 hidden sm:inline flex items-center gap-1 font-sans">
          <Clock className="w-3 h-3 text-gray-400" />
          ~{readingTime} min read
        </span>
      </div>
      <div className="flex items-center gap-3">
        {children}
        <span className="font-mono font-medium">{info.words.toLocaleString()} words</span>
        <span className="text-gray-400 text-[11px] font-mono hidden md:inline">({info.chars.toLocaleString()} chars)</span>
      </div>
    </div>
  );
}
