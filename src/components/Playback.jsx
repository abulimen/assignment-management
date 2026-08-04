import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { TextSelection } from '@tiptap/pm/state';
import { Step } from '@tiptap/pm/transform';
import { Plugin } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Play, Pause, SkipBack, SkipForward, FileText, Film, Highlighter } from 'lucide-react';

// ProseMirror Step Replay with DOM overlay highlighting.
// Highlighting is rendered as a separate transparent overlay layer on top
// of the editor — no ProseMirror decorations, no position tracking, no
// re-render bugs. Toggle just shows/hides the overlay div.

export default function Playback({ events, finalContent }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState('playback');
  const [highlight, setHighlight] = useState(false);
  const intervalRef = useRef(null);
  const contentRef = useRef(null);
  const overlayRef = useRef(null);
  const isDispatching = useRef(false);
  const lastIndexRef = useRef(-1);

  const stepEvents = useMemo(
    () => (events || []).filter(e => e.steps && e.steps.length > 0),
    [events]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
    ],
    content: '',
    editable: false,
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none' },
    },
  });

  // Cursor decoration plugin
  useEffect(() => {
    if (!editor) return;
    const cursorPlugin = new Plugin({
      props: {
        decorations: (state) => {
          const decos = [];
          const { from, to } = state.selection;
          if (from === to) {
            decos.push(Decoration.widget(from, () => {
              const el = document.createElement('span');
              el.className = 'playback-caret';
              return el;
            }));
          } else {
            decos.push(Decoration.inline(from, to, { class: 'playback-selection' }));
          }
          return DecorationSet.create(state.doc, decos);
        },
      },
    });
    editor.registerPlugin(cursorPlugin);
    return () => { editor.unregisterPlugin(cursorPlugin.key); };
  }, [editor]);

  // --- Highlight ranges computed once from events ---
  const highlightRanges = useMemo(() => {
    if (!events) return { pasted: [], edited: [] };

    const pasted = [];
    const deletes = events.filter(e => e.type === 'delete');

    // Find external paste events
    for (const e of events) {
      if (e.type === 'paste' && e.data?.external_paste) {
        const pos = e.data.position ?? 0;
        const len = e.data.pasted_text_length || e.data.pasted_text?.length || 0;
        if (len > 0) {
          pasted.push({ from: pos, to: pos + len, deleted: 0 });
        }
      }
    }

    // Track deletes that overlap paste ranges
    for (const del of deletes) {
      const delPos = del.data?.position ?? 0;
      const delLen = del.data?.length ?? 0;
      for (const pr of pasted) {
        if (delPos < pr.to && (delPos + delLen) > pr.from) {
          const overlapStart = Math.max(delPos, pr.from);
          const overlapEnd = Math.min(delPos + delLen, pr.to);
          pr.deleted += Math.max(0, overlapEnd - overlapStart);
        }
      }
    }

    // Split into unmodified pasted vs edited
    const unmodified = [];
    const edited = [];
    for (const pr of pasted) {
      const survived = pr.to - pr.from - pr.deleted;
      if (survived > 0) {
        unmodified.push({ from: pr.from, to: pr.from + survived });
      }
      if (pr.deleted > 0) {
        edited.push({ from: pr.from, to: pr.to });
      }
    }

    return { pasted: unmodified, edited };
  }, [events]);

  // --- Render overlay whenever currentIndex changes ---
  useEffect(() => {
    if (!highlight || !overlayRef.current || !contentRef.current) return;

    const raf = requestAnimationFrame(() => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      overlay.innerHTML = '';

      const editorEl = contentRef.current?.querySelector('.ProseMirror');
      if (!editorEl) return;

      const editorRect = editorEl.getBoundingClientRect();
      const allRanges = [...highlightRanges.pasted, ...highlightRanges.edited];

      for (const range of allRanges) {
        try {
          // Find the text node at the range position
          const walker = document.createTreeWalker(editorEl, NodeFilter.SHOW_TEXT);
          let node;
          let charCount = 0;
          let startNode = null, startOffset = 0;
          let endNode = null, endOffset = 0;

          while ((node = walker.nextNode())) {
            const nodeLen = node.textContent.length;
            if (!startNode && charCount + nodeLen > range.from) {
              startNode = node;
              startOffset = range.from - charCount;
            }
            if (!endNode && charCount + nodeLen >= range.to) {
              endNode = node;
              endOffset = range.to - charCount;
              break;
            }
            charCount += nodeLen;
          }

          if (startNode && endNode) {
            const r = document.createRange();
            r.setStart(startNode, Math.min(startOffset, startNode.textContent.length));
            r.setEnd(endNode, Math.min(endOffset, endNode.textContent.length));
            const rects = r.getClientRects();

            const isEdited = highlightRanges.edited.some(er => er.from === range.from);
            const color = isEdited ? 'rgba(234, 179, 8, 0.22)' : 'rgba(239, 68, 68, 0.18)';

            for (const rect of rects) {
              const div = document.createElement('div');
              div.style.cssText = `
                position: absolute;
                left: ${rect.left - editorRect.left}px;
                top: ${rect.top - editorRect.top}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                background: ${color};
                pointer-events: none;
                mix-blend-mode: multiply;
              `;
              overlay.appendChild(div);
            }
          }
        } catch (e) {
          // Skip invalid ranges
        }
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [highlight, currentIndex, highlightRanges]);

  // Apply a single step event
  const applyStepEvent = useCallback((event) => {
    if (!editor || !event?.steps) return;

    const { state } = editor.view;
    let tr = state.tr;
    for (const stepJson of event.steps) {
      try {
        const step = Step.fromJSON(state.schema, stepJson);
        tr = tr.step(step);
      } catch (e) { /* skip invalid */ }
    }

    if (event.selection?.from != null) {
      const from = Math.min(event.selection.from, tr.doc.content.size);
      try {
        const resolved = tr.doc.resolve(from);
        if (resolved.parent.isTextblock) {
          tr = tr.setSelection(TextSelection.create(tr.doc, from));
        }
      } catch (e) { /* skip */ }
    }

    isDispatching.current = true;
    editor.view.dispatch(tr);
    isDispatching.current = false;
  }, [editor]);

  // Full rebuild from 0 to index
  const rebuildToIndex = useCallback((index) => {
    if (!editor) return;
    isDispatching.current = true;
    editor.commands.clearContent();
    isDispatching.current = false;
    for (let i = 0; i <= index && i < stepEvents.length; i++) {
      applyStepEvent(stepEvents[i]);
    }
    lastIndexRef.current = index;
  }, [editor, stepEvents, applyStepEvent]);

  // Reset on events change
  useEffect(() => {
    lastIndexRef.current = -1;
  }, [stepEvents]);

  // Replay logic
  useEffect(() => {
    if (mode !== 'playback' || !editor || stepEvents.length === 0) return;
    if (isDispatching.current) return;

    if (currentIndex === 0 && lastIndexRef.current === -1) {
      rebuildToIndex(0);
    } else if (currentIndex === lastIndexRef.current + 1) {
      applyStepEvent(stepEvents[currentIndex]);
      lastIndexRef.current = currentIndex;
    } else if (currentIndex !== lastIndexRef.current) {
      rebuildToIndex(currentIndex);
    }
  }, [currentIndex, mode, editor, stepEvents, applyStepEvent, rebuildToIndex]);

  // Switch to final document
  useEffect(() => {
    if (mode === 'final' && editor && finalContent) {
      isDispatching.current = true;
      try { editor.commands.setContent(JSON.parse(finalContent)); }
      catch (e) { editor.commands.setContent(finalContent); }
      isDispatching.current = false;
      lastIndexRef.current = -1;
    } else if (mode === 'playback' && editor && lastIndexRef.current === -1) {
      rebuildToIndex(currentIndex);
    }
  }, [mode, editor, finalContent, currentIndex, rebuildToIndex]);

  // Playback loop
  useEffect(() => {
    if (playing && stepEvents.length > 0) {
      const delay = 200 / speed;
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= stepEvents.length - 1) { setPlaying(false); return prev; }
          return prev + 1;
        });
      }, delay);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, stepEvents.length]);

  // Auto-scroll
  useEffect(() => {
    if (mode === 'playback' && contentRef.current) {
      const el = contentRef.current.querySelector('.ProseMirror');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [currentIndex, mode]);

  const hasFinal = !!finalContent;
  const hasEvents = stepEvents.length > 0;

  if (!hasEvents && !hasFinal) {
    return <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">No data to display.</div>;
  }

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
              <button onClick={() => { setPlaying(false); setCurrentIndex(stepEvents.length - 1); }} className="p-1.5 rounded hover:bg-gray-200 text-gray-600"><SkipForward className="w-4 h-4" /></button>
              <div className="flex-1 mx-2">
                <input type="range" min={0} max={Math.max(stepEvents.length - 1, 0)} value={currentIndex}
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
              <div className="w-px h-5 bg-gray-300 mx-1" />
              <button onClick={() => setHighlight(h => !h)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors ${highlight ? 'bg-yellow-100 text-yellow-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                <Highlighter className="w-3.5 h-3.5" />
                {highlight ? 'On' : 'Off'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Step {currentIndex + 1} of {stepEvents.length}
              </div>
              {highlight && (
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200 border border-red-400" /> Pasted</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-200 border border-yellow-400" /> Edited</span>
                </div>
              )}
            </div>
          </>
        )}
        {mode === 'final' && <div className="text-xs text-gray-500">The student's final submitted document</div>}
      </div>

      <div ref={contentRef} className="relative min-h-[300px] max-h-[600px] overflow-y-auto">
        <div className="p-6">
          <EditorContent editor={editor} />
        </div>
        {/* Highlight overlay — positioned absolutely over the editor content */}
        <div
          ref={overlayRef}
          className="absolute inset-0 pointer-events-none"
          style={{ display: highlight ? 'block' : 'none' }}
        />
      </div>
    </div>
  );
}