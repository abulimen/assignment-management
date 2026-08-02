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

// ProseMirror Step Replay with Grammarly-style source highlighting.
// Tracks which character ranges were typed vs pasted vs edited-paste,
// and renders transparent color overlays via ProseMirror decorations.

export default function Playback({ events, finalContent }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState('playback');
  const [highlight, setHighlight] = useState(false);
  const intervalRef = useRef(null);
  const contentRef = useRef(null);
  const isDispatching = useRef(false);
  const lastIndexRef = useRef(-1);

  // Range map: tracks which doc ranges are typed/pasted/edited
  // Each entry: {from, to, type: 'typed'|'pasted'|'edited'}
  const rangesRef = useRef([]);
  // Refs for the decoration plugin to read current state
  const highlightRef = useRef(false);
  const rangesForPlugin = useRef([]);

  // Keep refs synced
  useEffect(() => { highlightRef.current = highlight; }, [highlight]);

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

  // Combined decoration plugin: cursor caret + source highlighting
  useEffect(() => {
    if (!editor) return;

    const cursorAndHighlightPlugin = new Plugin({
      props: {
        decorations: (state) => {
          const decos = [];
          const { from, to } = state.selection;

          // Cursor widget
          if (from === to) {
            decos.push(Decoration.widget(from, () => {
              const el = document.createElement('span');
              el.className = 'playback-caret';
              return el;
            }));
          } else {
            decos.push(Decoration.inline(from, to, { class: 'playback-selection' }));
          }

          // Source highlighting
          if (highlightRef.current) {
            const ranges = rangesForPlugin.current;
            for (const range of ranges) {
              const safeFrom = Math.max(0, Math.min(range.from, state.doc.content.size));
              const safeTo = Math.max(safeFrom, Math.min(range.to, state.doc.content.size));
              if (safeTo > safeFrom) {
                const cls = range.type === 'typed' ? 'hl-typed'
                          : range.type === 'edited' ? 'hl-edited'
                          : 'hl-pasted';
                decos.push(Decoration.inline(safeFrom, safeTo, { class: cls }));
              }
            }
          }

          return DecorationSet.create(state.doc, decos);
        },
      },
    });

    editor.registerPlugin(cursorAndHighlightPlugin);
    return () => { editor.unregisterPlugin(cursorAndHighlightPlugin.key); };
  }, [editor]);

  // Update ranges through a step's mapping and add new ranges for paste/keystroke events
  const updateRanges = useCallback((tr, event) => {
    const mapping = tr.mapping;
    let ranges = rangesRef.current;

    // Map existing ranges through the step
    ranges = ranges.map(r => ({
      ...r,
      from: mapping.map(r.from, -1), // map backward for deletions
      to: mapping.map(r.to, 1),       // map forward for insertions
    })).filter(r => r.from < r.to);

    // For paste events: add a 'pasted' range
    if (event?.type === 'paste' && event.data?.external_paste) {
      const pos = event.data.position ?? 0;
      const len = event.data.pasted_text_length || event.data.pasted_text?.length || 0;
      if (len > 0) {
        const mappedPos = mapping.map(pos);
        ranges.push({ from: mappedPos, to: mappedPos + len, type: 'pasted' });
      }
    }

    // For keystroke/step events that insert text: check if insertion is inside a pasted range
    // If so, split the pasted range and mark the inserted portion as 'typed' or 'edited'
    if (event?.steps) {
      for (const stepJson of event.steps) {
        if (stepJson.stepType === 'replace') {
          const from = stepJson.from ?? 0;
          const to = stepJson.to ?? 0;
          const deleted = to - from;

          // Extract inserted length
          let insertedLen = 0;
          if (stepJson.slice?.content) {
            insertedLen = countSliceText(stepJson.slice.content);
          }

          if (insertedLen > 0 && !event.data?.external_paste) {
            // This is a typed insertion (not an external paste)
            const mappedFrom = mapping.map(from);
            const mappedTo = mappedFrom + insertedLen;

            // Check if this insertion overlaps any pasted range → mark as edited
            const newRanges = [];
            for (const r of ranges) {
              if (r.type === 'pasted' && mappedFrom >= r.from && mappedTo <= r.to) {
                // Insertion is entirely within a pasted range → split into edited
                if (mappedFrom > r.from) newRanges.push({ from: r.from, to: mappedFrom, type: 'pasted' });
                newRanges.push({ from: mappedFrom, to: mappedTo, type: 'edited' });
                if (mappedTo < r.to) newRanges.push({ from: mappedTo, to: r.to, type: 'pasted' });
              } else {
                newRanges.push(r);
              }
            }
            ranges = newRanges;
          }

          // If a delete overlaps a pasted range, mark surviving parts as edited
          if (deleted > 0) {
            const delFrom = from;
            const delTo = to;
            const newRanges = [];
            for (const r of ranges) {
              if (r.type === 'pasted') {
                const rFrom = mapping.invert().map(r.from);
                const rTo = mapping.invert().map(r.to);
                if (delFrom < rTo && delTo > rFrom) {
                  // Delete overlaps this pasted range → mark as edited
                  newRanges.push({ ...r, type: 'edited' });
                } else {
                  newRanges.push(r);
                }
              } else {
                newRanges.push(r);
              }
            }
            ranges = newRanges;
          }
        }
      }
    }

    rangesRef.current = ranges;
    rangesForPlugin.current = ranges;
  }, []);

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

    // Update range map BEFORE dispatching
    updateRanges(tr, event);

    isDispatching.current = true;
    editor.view.dispatch(tr);
    isDispatching.current = false;
  }, [editor, updateRanges]);

  // Full rebuild from 0 to index
  const rebuildToIndex = useCallback((index) => {
    if (!editor) return;
    rangesRef.current = [];
    rangesForPlugin.current = [];
    isDispatching.current = true;
    editor.commands.clearContent();
    isDispatching.current = false;
    for (let i = 0; i <= index && i < stepEvents.length; i++) {
      applyStepEvent(stepEvents[i]);
    }
    lastIndexRef.current = index;
  }, [editor, stepEvents, applyStepEvent]);

  // Reset ranges when events change
  useEffect(() => {
    lastIndexRef.current = -1;
    rangesRef.current = [];
    rangesForPlugin.current = [];
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
      rangesRef.current = [];
      rangesForPlugin.current = [];
    } else if (mode === 'playback' && editor && lastIndexRef.current === -1) {
      rebuildToIndex(currentIndex);
    }
  }, [mode, editor, finalContent, currentIndex, rebuildToIndex]);

  // Force re-render decorations when highlight toggles
  useEffect(() => {
    if (editor && !isDispatching.current) {
      // Dispatch a no-op transaction to trigger decoration re-evaluation
      isDispatching.current = true;
      editor.view.dispatch(editor.state.tr);
      isDispatching.current = false;
    }
  }, [highlight, editor]);

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
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-200 border border-green-400" /> Typed</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200 border border-red-400" /> Pasted</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-200 border border-yellow-400" /> Edited</span>
                </div>
              )}
            </div>
          </>
        )}
        {mode === 'final' && <div className="text-xs text-gray-500">The student's final submitted document</div>}
      </div>

      <div ref={contentRef} className="min-h-[300px] max-h-[600px] overflow-y-auto">
        <div className="p-6">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

// Helper: count text in ProseMirror slice content
function countSliceText(content) {
  let len = 0;
  for (const node of content) {
    if (node.text) len += node.text.length;
    else if (node.content) len += countSliceText(node.content);
  }
  return len;
}