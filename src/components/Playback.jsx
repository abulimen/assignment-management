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
import { Play, Pause, SkipBack, SkipForward, FileText, Film } from 'lucide-react';

// ProseMirror Step Replay.
// Replays raw ProseMirror transaction steps into a hidden TipTap editor.
// Uses a guard ref to prevent the dispatch → emit → re-render → dispatch
// infinite loop that TipTap's React integration causes.

export default function Playback({ events, finalContent }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState('playback');
  const intervalRef = useRef(null);
  const contentRef = useRef(null);
  const isDispatching = useRef(false); // Guards against re-entrant dispatches
  const lastIndexRef = useRef(-1);     // Tracks what we've already replayed

  // Memoize step events so identity is stable across renders
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
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
  });

  // Cursor decoration plugin — draws a blinking caret block at the
  // current selection position. Needed because editable:false editors
  // don't show a native cursor.
  useEffect(() => {
    if (!editor) return;

    const cursorPlugin = new Plugin({
      props: {
        decorations: (state) => {
          const { from, to } = state.selection;
          if (from === to) {
            // Collapsed selection — show a cursor block
            return DecorationSet.create(state.doc, [
              Decoration.widget(from, () => {
                const el = document.createElement('span');
                el.className = 'playback-caret';
                return el;
              })
            ]);
          }
          // Range selection — highlight it
          return DecorationSet.create(state.doc, [
            Decoration.inline(from, to, { class: 'playback-selection' })
          ]);
        },
      },
    });

    editor.registerPlugin(cursorPlugin);
    return () => { editor.unregisterPlugin(cursorPlugin.key); };
  }, [editor]);

  // Apply a single step event — guarded against re-entrancy
  const applyStepEvent = useCallback((event) => {
    if (!editor || !event?.steps) return;

    const { state } = editor.view;
    let tr = state.tr;
    for (const stepJson of event.steps) {
      try {
        const step = Step.fromJSON(state.schema, stepJson);
        tr = tr.step(step);
      } catch (e) {
        // Skip invalid steps
      }
    }

    if (event.selection?.from != null) {
      const from = Math.min(event.selection.from, tr.doc.content.size);
      try {
        const resolved = tr.doc.resolve(from);
        // Only set text selection if the position has inline content
        if (resolved.parent.isTextblock) {
          tr = tr.setSelection(TextSelection.create(tr.doc, from));
        }
      } catch (e) {
        // Invalid position — skip
      }
    }

    isDispatching.current = true;
    editor.view.dispatch(tr);
    isDispatching.current = false;
  }, [editor]);

  // Full rebuild from 0 to index — only called when scrubbing/jumping
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

  // Reset replay state when events change (new data loaded)
  useEffect(() => {
    lastIndexRef.current = -1;
  }, [stepEvents]);

  // Replay logic: if advancing by 1, just apply the next step.
  // If jumping (scrub), do a full rebuild.
  useEffect(() => {
    if (mode !== 'playback' || !editor || stepEvents.length === 0) return;
    if (isDispatching.current) return; // Guard against re-entrant calls

    if (currentIndex === 0 && lastIndexRef.current === -1) {
      // First load — rebuild from 0
      rebuildToIndex(0);
    } else if (currentIndex === lastIndexRef.current + 1) {
      // Sequential advance — just apply the next step
      applyStepEvent(stepEvents[currentIndex]);
      lastIndexRef.current = currentIndex;
    } else if (currentIndex !== lastIndexRef.current) {
      // Jump (scrub) — full rebuild
      rebuildToIndex(currentIndex);
    }
  }, [currentIndex, mode, editor, stepEvents, applyStepEvent, rebuildToIndex]);

  // Switch to final document
  useEffect(() => {
    if (mode === 'final' && editor && finalContent) {
      isDispatching.current = true;
      try {
        editor.commands.setContent(JSON.parse(finalContent));
      } catch (e) {
        editor.commands.setContent(finalContent);
      }
      isDispatching.current = false;
      lastIndexRef.current = -1; // Invalidate replay cache
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
          if (prev >= stepEvents.length - 1) {
            setPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    }
    return () => clearInterval(intervalRef.current);
  }, [playing, speed, stepEvents.length]);

  // Auto-scroll to bottom (cursor follows typing)
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
            </div>
            <div className="text-xs text-gray-500">
              Step {currentIndex + 1} of {stepEvents.length}
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