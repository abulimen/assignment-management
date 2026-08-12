import { useEffect, useMemo, useRef } from 'react';
import Editor from './Editor';
import { AuthorMark } from '../extensions/AuthorMark';
import { PastedMark } from '../extensions/PastedMark';
import { buildAuthorColorMap, AUTHOR_PALETTE } from '../utils/authorship';
import { annotatePasted } from '../utils/pasted';
import { wrapFlatContent } from '../utils/sectionDoc';
import { Users, ClipboardPaste } from 'lucide-react';

// Read-only annotated view of a merged group document. The merged TipTap
// JSON already carries an `author` mark on each member's text; this renders
// those marks in a distinct color per member, overlays externally pasted
// text in bright red, and shows the author's name on hover.
export default function GroupFinalDoc({ content, sections }) {
  const wrapRef = useRef(null);

  // authorId -> palette color
  const colorMap = useMemo(() => {
    const idx = buildAuthorColorMap(sections || []);
    const map = {};
    for (const [id, i] of Object.entries(idx)) map[id] = AUTHOR_PALETTE[i];
    return map;
  }, [sections]);

  // authorId -> externally pasted strings
  const pastedByAuthor = useMemo(() => {
    const map = {};
    (sections || []).forEach(s => {
      map[String(s.student_id)] = s.pasted_texts || [];
    });
    return map;
  }, [sections]);

  // Merged content + red pasted overlay marks; legacy flat snapshots are
  // normalized into a single section so they render on the same sheets.
  const annotated = useMemo(() => {
    if (!content) return null;
    try {
      return JSON.stringify(wrapFlatContent(annotatePasted(JSON.parse(content), pastedByAuthor)));
    } catch (e) {
      return content;
    }
  }, [content, pastedByAuthor]);

  // Inject a <style> block mapping .author-{id} to its color
  useEffect(() => {
    const styleId = 'author-colors';
    let el = document.getElementById(styleId);
    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = Object.entries(colorMap)
      .map(([id, color]) => `.author-${id} { background-color: ${color}; }`)
      .join('\n');
  }, [colorMap]);

  // Hover tooltip: name of the student who wrote the hovered text
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    let tip = null;

    const names = {};
    (sections || []).forEach(s => { names[String(s.student_id)] = s.student_name; });

    const onMove = (e) => {
      const authorEl = e.target.closest('[data-author]');
      if (!authorEl || !root.contains(authorEl)) {
        if (tip) { tip.remove(); tip = null; }
        return;
      }
      const name = names[authorEl.getAttribute('data-author')] || 'Unknown';
      const pasted = !!e.target.closest('[data-pasted]');

      if (!tip) {
        tip = document.createElement('div');
        tip.className = 'hl-tooltip';
        tip.style.background = '#1f2937';
        document.body.appendChild(tip);
      }
      tip.textContent = pasted ? `${name} · pasted from external source` : name;
      tip.style.left = `${e.clientX}px`;
      tip.style.top = `${e.clientY - 35}px`;
    };
    const onLeave = () => { if (tip) { tip.remove(); tip = null; } };

    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);
    return () => {
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
      if (tip) tip.remove();
    };
  }, [sections]);

  return (
    <div ref={wrapRef}>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <Users className="w-4 h-4 text-gray-400" />
        {(sections || []).map(s => (
          <span key={s.student_id} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="w-3 h-3 rounded-sm border border-gray-300" style={{ backgroundColor: colorMap[s.student_id] }} />
            {s.student_name}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <ClipboardPaste className="w-3.5 h-3.5 text-red-600" />
          <span className="w-3 h-3 rounded-sm bg-red-600/10 border-b-[3px] border-red-600" />
          Pasted from external source
        </span>
      </div>
      <Editor
        editable={false}
        extraExtensions={[AuthorMark, PastedMark]}
        initialContent={annotated}
      />
    </div>
  );
}
