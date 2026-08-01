import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, SkipBack, SkipForward, FileText, Film } from 'lucide-react';

// Typewriter-style replay. Builds the document as a plain string,
// tracking cursor position ourselves. No ProseMirror position math.
// Blinking cursor block follows the virtual cursor position.

export default function Playback({ events, finalContent }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState('playback');
  const intervalRef = useRef(null);
  const contentRef = useRef(null);

  // Build document state up to a given event index.
  // Returns { text, cursor, paragraphs } where paragraphs is an array of strings.
  const buildState = useCallback((index) => {
    if (!events?.length) return { paragraphs: [''], cursor: 0 };

    // Use snapshot as starting point if available (performance for large docs)
    let snapshotIdx = -1;
    for (let i = index; i >= 0; i--) {
      if (events[i]?.type === 'snapshot') { snapshotIdx = i; break; }
    }

    // Start from snapshot or empty
    let paragraphs;
    let cursor;

    if (snapshotIdx >= 0 && events[snapshotIdx].data.doc) {
      // Reconstruct paragraphs from ProseMirror JSON
      paragraphs = docToParagraphs(events[snapshotIdx].data.doc);
      // Can't know exact cursor from snapshot — set to end of doc
      cursor = paragraphs.reduce((sum, p) => sum + p.length + 1, -1);
    } else {
      paragraphs = [''];
      cursor = 0;
    }

    // Apply events after the snapshot up to index
    const startIdx = snapshotIdx >= 0 ? snapshotIdx + 1 : 0;
    for (let i = startIdx; i <= index && i < events.length; i++) {
      const e = events[i];
      const { paraIdx, charIdx } = cursorToPos(cursor, paragraphs);

      switch (e.type) {
        case 'keystroke': {
          const char = e.data.char;
          if (char === '\n') {
            // New paragraph
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
          // Handle multi-line paste
          const lines = text.split('\n');
          if (lines.length === 1) {
            paragraphs[paraIdx] = paragraphs[paraIdx].slice(0, charIdx) + text + paragraphs[paraIdx].slice(charIdx);
            cursor += text.length;
          } else {
            // Split current paragraph at cursor
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
          const len = e.data.length || 1;
          for (let d = 0; d < len; d++) {
            if (charIdx > 0) {
              // Delete char before cursor in same paragraph
              paragraphs[paraIdx] = paragraphs[paraIdx].slice(0, charIdx - 1) + paragraphs[paraIdx].slice(charIdx);
              cursor -= 1;
            } else if (paraIdx > 0) {
              // Merge with previous paragraph
              const prev = paragraphs[paraIdx - 1];
              paragraphs[paraIdx - 1] = prev + paragraphs[paraIdx];
              paragraphs.splice(paraIdx, 1);
              cursor -= 1;
            }
          }
          break;
        }
        case 'cursor_jump': {
          cursor = Math.max(0, Math.min(e.data.to, paragraphs.reduce((s, p) => s + p.length + 1, -1)));
          break;
        }
        case 'snapshot':
          // Already handled above
          break;
        case 'format':
          // Formatting not shown in typewriter mode
          break;
      }
    }

    return { paragraphs, cursor };
  }, [events]);

  const { paragraphs, cursor } = useMemo(() => buildState(currentIndex), [currentIndex, buildState]);

  // Auto-scroll to cursor
  useEffect(() => {
    if (mode === 'playback' && contentRef.current) {
      const cursorEl = contentRef.current.querySelector('[data-cursor]');
      if (cursorEl) {
        cursorEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [cursor, mode, paragraphs]);

  // Playback loop
  useEffect(() => {
    if (playing && events?.length) {
      const delay = 150 / speed;
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= events.length - 1) {
            setPlaying(false);
            return prev;
          }
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

  // Compute cursor position for rendering
  let renderParas = paragraphs || [''];
  let cursorPara = 0;
  let cursorChar = 0;
  if (mode === 'playback') {
    const pos = cursorToPos(cursor, renderParas);
    cursorPara = pos.paraIdx;
    cursorChar = pos.charIdx;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 p-3">
        {/* Tab toggle */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setMode('playback')}
            disabled={!hasEvents}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              mode === 'playback' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
            } ${!hasEvents ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Film className="w-4 h-4" /> Playback
          </button>
          <button
            onClick={() => setMode('final')}
            disabled={!hasFinal}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
              mode === 'final' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
            } ${!hasFinal ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <FileText className="w-4 h-4" /> Final Document
          </button>
        </div>

        {/* Playback controls */}
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

        {mode === 'final' && (
          <div className="text-xs text-gray-500">The student's final submitted document</div>
        )}
      </div>

      {/* Content area */}
      <div ref={contentRef} className="p-6 min-h-[300px] max-h-[600px] overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap break-words">
        {mode === 'final' ? (
          <div className="font-sans">
            {finalContent ? renderFinalDoc(finalContent) : <span className="text-gray-400">No final document saved.</span>}
          </div>
        ) : (
          renderParas.map((para, pi) => (
            <div key={pi} className="min-h-[1.5em] mb-2">
              {pi === cursorPara ? (
                <>
                  <span>{para.slice(0, cursorChar)}</span>
                  <span data-cursor className="inline-block w-2 h-4 bg-primary-600 align-middle animate-pulse mr-px" />
                  <span>{para.slice(cursorChar)}</span>
                </>
              ) : (
                <span>{para}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Convert ProseMirror cursor offset to {paraIdx, charIdx}
function cursorToPos(cursor, paragraphs) {
  let pos = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const paraLen = paragraphs[i].length;
    if (pos + paraLen >= cursor) {
      return { paraIdx: i, charIdx: cursor - pos };
    }
    pos += paraLen + 1; // +1 for paragraph boundary
  }
  return { paraIdx: paragraphs.length - 1, charIdx: paragraphs[paragraphs.length - 1].length };
}

// Convert ProseMirror doc JSON to array of paragraph strings
function docToParagraphs(doc) {
  if (!doc || !doc.content) return [''];
  const paras = [];
  for (const node of doc.content) {
    if (node.type === 'paragraph' || node.type === 'heading') {
      let text = '';
      if (node.content) {
        for (const child of node.content) {
          if (child.text) text += child.text;
        }
      }
      paras.push(text);
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      if (node.content) {
        for (const item of node.content) {
          if (item.content) {
            for (const child of item.content) {
              if (child.content) {
                for (const text of child.content) {
                  if (text.text) paras.push(text.text);
                }
              }
            }
          }
        }
      }
    }
  }
  return paras.length > 0 ? paras : [''];
}

// Render final document from TipTap JSON or plain text
function renderFinalDoc(content) {
  try {
    const doc = typeof content === 'string' ? JSON.parse(content) : content;
    if (doc && doc.content) {
      return doc.content.map((node, i) => {
        let text = '';
        if (node.content) {
          for (const child of node.content) {
            if (child.text) text += child.text;
          }
        }
        if (node.type === 'heading') {
          const level = node.attrs?.level || 1;
          const sizes = { 1: 'text-2xl font-bold', 2: 'text-xl font-bold', 3: 'text-lg font-semibold' };
          return <div key={i} className={`${sizes[level] || 'font-bold'} mb-2 mt-3`}>{text}</div>;
        }
        if (node.type === 'bulletList') {
          return <ul key={i} className="list-disc pl-6 mb-2">{node.content?.map((item, j) => <li key={j}>{renderListItem(item)}</li>)}</ul>;
        }
        return <p key={i} className="mb-2 leading-relaxed">{text}</p>;
      });
    }
  } catch (e) {
    // Fall through to plain text
  }
  return <span>{content}</span>;
}

function renderListItem(item) {
  let text = '';
  if (item.content) {
    for (const para of item.content) {
      if (para.content) {
        for (const child of para.content) {
          if (child.text) text += child.text;
        }
      }
    }
  }
  return text;
}