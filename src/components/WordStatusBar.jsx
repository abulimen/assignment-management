import { useEffect, useState } from 'react';

// Word-style status bar: section position, word count, plus a slot for
// presence/state badges on the right.
export default function WordStatusBar({ editor, editable = true, children }) {
  const [info, setInfo] = useState({ words: 0, sections: 0, current: 0 });

  useEffect(() => {
    if (!editor) return undefined;
    const update = () => {
      const doc = editor.state.doc;
      const text = doc.textContent.trim();
      const words = text ? text.split(/\s+/).length : 0;
      let current = doc.childCount;
      const pos = editor.state.selection.$from.pos;
      let offset = 0;
      for (let i = 0; i < doc.childCount; i++) {
        offset += doc.child(i).nodeSize;
        if (pos < offset) { current = i + 1; break; }
      }
      setInfo({ words, sections: doc.childCount, current });
    };
    update();
    editor.on('transaction', update);
    return () => { editor.off('transaction', update); };
  }, [editor]);

  return (
    <div className="word-statusbar">
      <div className="flex items-center gap-3">
        {editable
          ? <span>Section {info.current} of {info.sections}</span>
          : <span>Read-only</span>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        <span>{info.words} words</span>
      </div>
    </div>
  );
}
