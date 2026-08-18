import { useEffect, useMemo, useRef } from 'react';
import Editor from './Editor';
import { AuthorMark } from '../extensions/AuthorMark';
import { PastedMark } from '../extensions/PastedMark';
import { buildAuthorColorMap, AUTHOR_PALETTE } from '../utils/authorship';
import { annotatePasted } from '../utils/pasted';
import { wrapFlatContent } from '../utils/sectionDoc';
import { Users, ClipboardPaste } from 'lucide-react';

export default function GroupFinalDoc({ content, sections }) {
  const wrapRef = useRef(null);

  const colorMap = useMemo(() => {
    const idx = buildAuthorColorMap(sections || []);
    const map = {};
    for (const [id, i] of Object.entries(idx)) map[id] = AUTHOR_PALETTE[i];
    return map;
  }, [sections]);

  const pastedByAuthor = useMemo(() => {
    const map = {};
    (sections || []).forEach((s) => {
      map[String(s.student_id)] = s.pasted_texts || [];
    });
    return map;
  }, [sections]);

  const annotated = useMemo(() => {
    if (!content) return null;
    try {
      return JSON.stringify(wrapFlatContent(annotatePasted(JSON.parse(content), pastedByAuthor)));
    } catch (e) {
      return content;
    }
  }, [content, pastedByAuthor]);

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

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    let tip = null;

    const names = {};
    (sections || []).forEach((s) => {
      names[String(s.student_id)] = s.student_name;
    });

    const onMove = (e) => {
      const authorEl = e.target.closest('[data-author]');
      if (!authorEl || !root.contains(authorEl)) {
        if (tip) {
          tip.remove();
          tip = null;
        }
        return;
      }
      const name = names[authorEl.getAttribute('data-author')] || 'Unknown';
      const pasted = !!e.target.closest('[data-pasted]');

      if (!tip) {
        tip = document.createElement('div');
        tip.className = 'hl-tooltip';
        tip.style.background = '#1A1A1B';
        document.body.appendChild(tip);
      }
      tip.textContent = pasted ? `${name} · pasted from external source` : name;
      tip.style.left = `${e.clientX}px`;
      tip.style.top = `${e.clientY - 35}px`;
    };
    const onLeave = () => {
      if (tip) {
        tip.remove();
        tip = null;
      }
    };

    root.addEventListener('mousemove', onMove);
    root.addEventListener('mouseleave', onLeave);
    return () => {
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseleave', onLeave);
      if (tip) tip.remove();
    };
  }, [sections]);

  return (
    <div ref={wrapRef} className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-200 shrink-0 shadow-2xs flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono uppercase text-gray-500 mr-2">
          <Users className="w-3.5 h-3.5 text-[#0047FF]" />
          <span>Authors:</span>
        </div>
        {(sections || []).map((s) => (
          <span key={s.student_id} className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
            <span
              className="w-2.5 h-2.5 rounded-full border border-gray-300"
              style={{ backgroundColor: colorMap[s.student_id]?.replace('0.35', '1') || '#0047FF' }}
            />
            {s.student_name}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded ml-auto">
          <ClipboardPaste className="w-3.5 h-3.5 text-red-600" />
          <span>External Pasted Text</span>
        </span>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Editor
          editable={false}
          extraExtensions={[AuthorMark, PastedMark]}
          initialContent={annotated}
        />
      </div>
    </div>
  );
}
