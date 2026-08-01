import { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, FileText, Film } from 'lucide-react';

// Typewriter-style replay. Builds the document as a plain string array,
// tracking cursor position ourselves. Uses event positions (converted from
// ProseMirror offsets) to insert at the correct location, fixing the
// "characters skip/reappear" bug that occurred when loading snapshots.
// Tracks formatting marks (bold, italic) and renders them inline.

export default function Playback({ events, finalContent }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState('playback');
  const intervalRef = useRef(null);
  const contentRef = useRef(null);

  // Build document state: paragraphs as strings, plus active formatting ranges.
  // Returns { paragraphs, cursor, formats } where formats is [{from, to, type}]
  const state = useMemo(() => {
    if (!events?.length) return { paragraphs: [''], cursor: 0, formats: [] };

    let paragraphs = [''];
    let cursor = 0;
    let formats = []; // {from, to, type: 'bold'|'italic'|'underline'|'code'}

    for (let i = 0; i <= currentIndex && i < events.length; i++) {
      const e = events[i];
      if (e.type === 'snapshot') continue;

      // Determine where to apply this event. Use the event's stored position
      // (converted from ProseMirror offsets) to avoid cursor drift.
      let insertPos = cursor;
      if (e.data.position !== undefined) {
        insertPos = pmToOurPos(e.data.position, paragraphs);
      } else if (e.type === 'cursor_jump' && e.data.to !== undefined) {
        insertPos = pmToOurPos(e.data.to, paragraphs);
      } else if (e.type === 'delete' && e.data.position !== undefined) {
        insertPos = pmToOurPos(e.data.position, paragraphs);
      }
      cursor = insertPos;

      const { paraIdx, charIdx } = cursorToParagraph(cursor, paragraphs);

      switch (e.type) {
        case 'keystroke': {
          const char = e.data.char;
          if (char === '\n') {
            const after = paragraphs[paraIdx].slice(charIdx);
            paragraphs[paraIdx] = paragraphs[paraIdx].slice(0, charIdx);
            paragraphs.splice(paraIdx + 1, 0, after);
            cursor += 1;
          } else {
            paragraphs[paraIdx] = paragraphs[paraIdx].slice(0, charIdx) + char + paragraphs[paraIdx].slice(charIdx);
            cursor += 1;
          }
          break;
        }
        case 'paste': {
          const text = e.data.text || '';
          const lines = text.split('\n');
          if (lines.length === 1) {
            paragraphs[paraIdx] = paragraphs[paraIdx].slice(0, charIdx) + text + paragraphs[paraIdx].slice(charIdx);
            cursor += text.length;
          } else {
            const before = paragraphs[paraIdx].slice(0, charIdx);
            const after = paragraphs[paraIdx].slice(charIdx);
            const newParas = [before + lines[0]];
            for (let j = 1; j < lines.length - 1; j++) {
              newParas.push(lines[j]);
            }
            newParas.push(lines[lines.length - 1] + after);
            paragraphs.splice(paraIdx, 1, ...newParas);
            cursor += text.length;
          }
          break;
        }
        case 'delete': {
          let remaining = e.data.length || 1;
          let delCursor = cursor;
          while (remaining > 0) {
            const dp = cursorToParagraph(delCursor, paragraphs);
            if (dp.charIdx > 0) {
              const remove = Math.min(remaining, dp.charIdx);
              paragraphs[dp.paraIdx] = paragraphs[dp.paraIdx].slice(0, dp.charIdx - remove) + paragraphs[dp.paraIdx].slice(dp.charIdx);
              delCursor -= remove;
              remaining -= remove;
            } else if (dp.paraIdx > 0) {
              const prev = paragraphs[dp.paraIdx - 1];
              paragraphs[dp.paraIdx - 1] = prev + paragraphs[dp.paraIdx];
              paragraphs.splice(dp.paraIdx, 1);
              delCursor -= 1;
              remaining -= 1;
            } else {
              break;
            }
          }
          cursor = delCursor;
          break;
        }
        case 'cursor_jump': {
          cursor = pmToOurPos(e.data.to, paragraphs);
          break;
        }
        case 'format': {
          if (e.data.active) {
            const from = pmToOurPos(e.data.from, paragraphs);
            const to = pmToOurPos(e.data.to, paragraphs);
            formats.push({ from, to, type: e.data.mark });
          } else {
            // Remove format
            const from = pmToOurPos(e.data.from, paragraphs);
            formats = formats.filter(f => !(f.type === e.data.mark && f.from === from));
          }
          break;
        }
      }
    }

    return { paragraphs, cursor, formats };
  }, [currentIndex, events]);

  // Auto-scroll
  useEffect(() => {
    if (mode === 'playback' && contentRef.current) {
      const el = contentRef.current.querySelector('[data-cursor]');
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [state.cursor, mode]);

  // Playback loop
  useEffect(() => {
    if (playing && events?.length) {
      const delay = 150 / speed;
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= events.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, delay);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, events]);

  const hasFinal = !!finalContent;
  const hasEvents = events?.length > 0;

  if (!hasEvents && !hasFinal) {
    return <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">No data to display.</div>;
  }

  const { paragraphs, cursor, formats } = state;
  const cursorPos = cursorToParagraph(cursor, paragraphs);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 p-3">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setMode('playback')} disabled={!hasEvents}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${mode === 'playback' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'} ${!hasEvents ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <Film className="w-4 h-4" /> Playback
          </button>
          <button onClick={() => setMode('final')} disabled={!hasFinal}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${mode === 'final' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'} ${!hasFinal ? 'opacity-40 cursor-not-allowed' : ''}`}>
            <FileText className="w-4 h-4" /> Final Document
          </button>
        </div>

        {mode === 'playback' && hasEvents && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => { setPlaying(false); setCurrentIndex(0); }} className="p-1.5 rounded hover:bg-gray-200 text-gray-600"><SkipBack className="w-4 h-4" /></button>
              <button onClick={() => setPlaying(!playing)} className="p-1.5 rounded hover:bg-gray-200 text-gray-600">
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => { setPlaying(false); setCurrentIndex(events.length - 1); }} className="p-1.5 rounded hover:bg-gray-200 text-gray-600"><SkipForward className="w-4 h-4" /></button>
              <div className="flex-1 mx-2">
                <input type="range" min={0} max={events.length - 1} value={currentIndex}
                  onChange={e => { setPlaying(false); setCurrentIndex(parseInt(e.target.value)); }}
                  className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-600" />
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 4].map(s => (
                  <button key={s} onClick={() => setSpeed(s)}
                    className={`px-2 py-1 text-xs rounded ${speed === s ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Event {currentIndex + 1} of {events.length}
              {events[currentIndex] && <> — {events[currentIndex].type}</>}
            </div>
          </>
        )}
        {mode === 'final' && <div className="text-xs text-gray-500">The student's final submitted document</div>}
      </div>

      <div ref={contentRef} className="p-6 min-h-[300px] max-h-[600px] overflow-y-auto text-sm leading-relaxed">
        {mode === 'final' ? (
          <div className="font-sans">{finalContent ? renderFinalDoc(finalContent) : <span className="text-gray-400">No final document saved.</span>}</div>
        ) : (
          paragraphs.map((para, pi) => {
            // Build formatted segments for this paragraph
            const segments = buildFormattedSegments(para, pi, paragraphs, formats, cursorPos, pi === cursorPos.paraIdx);
            return <div key={pi} className="min-h-[1.5em] mb-2 font-mono">{segments}</div>;
          })
        )}
      </div>
    </div>
  );
}

// --- Helpers ---

// Convert ProseMirror character offset to our flat string offset.
// PM offsets: each character = 1, each paragraph boundary = 2.
// Our offsets: each character = 1, each paragraph boundary = 1.
function pmToOurPos(pmPos, paragraphs) {
  let pmOffset = 0;
  let ourOffset = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const len = paragraphs[i].length;
    if (pmPos >= pmOffset && pmPos <= pmOffset + len) {
      return ourOffset + (pmPos - pmOffset);
    }
    pmOffset += len + 2;
    ourOffset += len + 1;
  }
  return ourOffset; // fallback: end of document
}

// Convert our flat string position to {paraIdx, charIdx}
function cursorToParagraph(cursor, paragraphs) {
  let pos = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const len = paragraphs[i].length;
    if (pos + len >= cursor) return { paraIdx: i, charIdx: Math.min(cursor - pos, len) };
    pos += len + 1;
  }
  return { paraIdx: paragraphs.length - 1, charIdx: paragraphs[paragraphs.length - 1].length };
}

// Our flat position to {paraIdx, charIdx}
function ourPosToParagraph(pos, paragraphs) {
  let offset = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const len = paragraphs[i].length;
    if (offset + len >= pos) return { paraIdx: i, charIdx: Math.min(pos - offset, len) };
    offset += len + 1;
  }
  return { paraIdx: paragraphs.length - 1, charIdx: paragraphs[paragraphs.length - 1].length };
}

// Build formatted segments for a paragraph, with cursor insertion
function buildFormattedSegments(para, paraIdx, paragraphs, formats, cursorPos, isCursorPara) {
  // Collect format ranges that overlap this paragraph
  const paraStart = paragraphs.slice(0, paraIdx).reduce((s, p) => s + p.length + 1, 0);
  const paraEnd = paraStart + para.length;

  const ranges = [];
  for (const f of formats) {
    if (f.to > paraStart && f.from < paraEnd) {
      ranges.push({
        from: Math.max(f.from - paraStart, 0),
        to: Math.min(f.to - paraStart, para.length),
        type: f.type,
      });
    }
  }
  ranges.sort((a, b) => a.from - b.from);

  // Build segments
  const segments = [];
  let pos = 0;
  for (const r of ranges) {
    if (r.from > pos) {
      segments.push({ text: para.slice(pos, r.from), format: null });
    }
    if (r.to > r.from) {
      segments.push({ text: para.slice(r.from, r.to), format: r.type });
    }
    pos = Math.max(pos, r.to);
  }
  if (pos < para.length) {
    segments.push({ text: para.slice(pos), format: null });
  }
  if (segments.length === 0) {
    segments.push({ text: para, format: null });
  }

  // Insert cursor if this is the cursor paragraph
  if (isCursorPara) {
    const cursorChar = cursorPos.charIdx;
    const result = [];
    let charOffset = 0;
    for (const seg of segments) {
      const segEnd = charOffset + seg.text.length;
      if (cursorChar >= charOffset && cursorChar <= segEnd) {
        const before = seg.text.slice(0, cursorChar - charOffset);
        const after = seg.text.slice(cursorChar - charOffset);
        if (before) result.push({ text: before, format: seg.format });
        result.push({ text: '', format: null, cursor: true });
        if (after) result.push({ text: after, format: seg.format });
      } else {
        result.push(seg);
      }
      charOffset = segEnd;
    }
    return result.map((s, i) => renderSegment(s, i));
  }

  return segments.map((s, i) => renderSegment(s, i));
}

function renderSegment(seg, key) {
  if (seg.cursor) {
    return <span key={key} data-cursor className="inline-block w-2 h-4 bg-primary-600 align-middle animate-pulse mx-px">&nbsp;</span>;
  }
  let cls = '';
  if (seg.format === 'bold') cls = 'font-bold';
  else if (seg.format === 'italic') cls = 'italic';
  else if (seg.format === 'underline') cls = 'underline';
  else if (seg.format === 'code') cls = 'bg-gray-100 rounded px-1';
  return <span key={key} className={cls}>{seg.text}</span>;
}

// Render final document from TipTap JSON
function renderFinalDoc(content) {
  try {
    const doc = typeof content === 'string' ? JSON.parse(content) : content;
    if (doc?.content) {
      return doc.content.map((node, i) => renderDocNode(node, i));
    }
  } catch (e) { /* fall through */ }
  return <span className="text-gray-400">{String(content)}</span>;
}

function renderDocNode(node, key) {
  if (node.type === 'paragraph') {
    return <p key={key} className="mb-2 leading-relaxed">{renderInline(node.content)}</p>;
  }
  if (node.type === 'heading') {
    const lvl = node.attrs?.level || 1;
    const sizes = { 1: 'text-2xl font-bold mb-3 mt-4', 2: 'text-xl font-bold mb-2 mt-3', 3: 'text-lg font-semibold mb-2 mt-2' };
    return <div key={key} className={sizes[lvl] || 'font-bold'}>{renderInline(node.content)}</div>;
  }
  if (node.type === 'bulletList') {
    return <ul key={key} className="list-disc pl-6 mb-2">{node.content?.map((item, j) => <li key={j}>{item.content?.map((p, k) => <span key={k}>{renderInline(p.content)}</span>)}</li>)}</ul>;
  }
  if (node.type === 'orderedList') {
    return <ol key={key} className="list-decimal pl-6 mb-2">{node.content?.map((item, j) => <li key={j}>{item.content?.map((p, k) => <span key={k}>{renderInline(p.content)}</span>)}</li>)}</ol>;
  }
  if (node.type === 'blockquote') {
    return <blockquote key={key} className="border-l-4 border-gray-300 pl-4 italic my-2">{node.content?.map((p, k) => <p key={k} className="mb-1">{renderInline(p.content)}</p>)}</blockquote>;
  }
  if (node.type === 'codeBlock') {
    return <pre key={key} className="bg-gray-900 text-gray-100 rounded-lg p-4 my-2 overflow-x-auto text-sm"><code>{renderInline(node.content)}</code></pre>;
  }
  return <span key={key}>{renderInline(node.content)}</span>;
}

function renderInline(content) {
  if (!content) return null;
  return content.map((node, i) => {
    if (node.type === 'text') {
      let cls = '';
      if (node.marks) {
        for (const m of node.marks) {
          if (m.type === 'bold') cls += ' font-bold';
          if (m.type === 'italic') cls += ' italic';
          if (m.type === 'underline') cls += ' underline';
          if (m.type === 'code') cls += ' bg-gray-100 rounded px-1 text-sm';
          if (m.type === 'link') cls += ' text-blue-600 underline';
        }
      }
      return <span key={i} className={cls}>{node.text}</span>;
    }
    if (node.type === 'hardBreak') return <br key={i} />;
    return null;
  });
}