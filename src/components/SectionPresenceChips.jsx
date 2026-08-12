import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Renders "Sarah is editing here" chips into each section sheet via portals
// (the mount points live in the Section node view). Re-renders when presence
// changes or the document structure changes.
export default function SectionPresenceChips({ editor, presence }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!editor) return undefined;
    const bump = () => setTick((t) => t + 1);
    editor.on('transaction', bump);
    return () => { editor.off('transaction', bump); };
  }, [editor]);

  if (!editor || !editor.view || !editor.view.dom) return null;

  const sheets = editor.view.dom.querySelectorAll('section[data-section-id]');
  return Array.from(sheets).map((sectionEl) => {
    const id = sectionEl.getAttribute('data-section-id');
    const mount = sectionEl.querySelector('.section-chips');
    const users = presence?.[id] || [];
    if (!mount || users.length === 0) return null;
    return createPortal(
      users.map((u, i) => (
        <span key={`${u.name}-${i}`} className="section-chip"
          style={{ backgroundColor: u.color }}
          title={`${u.name} is editing here`}>
          {u.name}
        </span>
      )),
      mount,
      id,
    );
  });
}
