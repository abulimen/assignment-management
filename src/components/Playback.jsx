import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { TextSelection } from '@tiptap/pm/state';
import { Play, Pause, SkipBack, SkipForward, FileText, Film } from 'lucide-react';

// ProseMirror Step Replay.
// Instead of reconstructing a document from keystroke events, we replay the
// actual ProseMirror transaction steps into a hidden TipTap editor instance.
// The editor handles ALL formatting, paragraphs, marks natively.
// The cursor position comes from the stored selection.

export default function Playback({ events, finalContent }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState('playback');
  const [appliedIndex, setAppliedIndex] = useState(-1);
  const intervalRef = useRef(null);
  const contentRef = useRef(null);
  const caretRef = useRef(null);

  // The hidden editor used for replay — same schema as the writing editor,
  // minus the tracker plugin (which would cause double-recording).
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

  // Filter to only events with steps (skip snapshots, cursor_jumps without steps)
  const stepEvents = (events || []).filter(e => e.steps && e.steps.length > 0);

  // Apply a single step event to the hidden editor
  const applyStepEvent = useCallback((event) => {
    if (!editor || !event?.steps) return;

    const { state } = editor.view;

    // Build a transaction from the stored steps
    let tr = state.tr;
    for (const stepJson of event.steps) {
      try {
        const step = state.schema.stepFromJSON(stepJson);
        tr = tr.step(step);
      } catch (e) {
        // Skip invalid steps
      }
    }

    // Set selection if available
    if (event.selection?.from != null) {
      const from = Math.min(event.selection.from, tr.doc.content.size);
      try {
        tr = tr.setSelection(TextSelection.create(tr.doc, from));
      } catch (e) {
        // If position is invalid, skip selection
      }
    }

    editor.view.dispatch(tr);
  }, [editor]);

  // Reset editor to empty and apply all steps up to a given index
  const replayToIndex = useCallback((index) => {
    if (!editor) return;

    // Clear the editor
    editor.commands.clearContent();

    // Apply all step events up to index
    for (let i = 0; i <= index && i < stepEvents.length; i++) {
      applyStepEvent(stepEvents[i]);
    }

    setAppliedIndex(index);
  }, [editor, stepEvents, applyStepEvent]);

  // When currentIndex changes, replay to that index
  useEffect(() => {
    if (mode === 'playback' && editor && stepEvents.length > 0) {
      replayToIndex(currentIndex);
    }
  }, [currentIndex, mode, editor, stepEvents.length, replayToIndex]);

  // Switch to final document
  useEffect(() => {
    if (mode === 'final' && editor && finalContent) {
      try {
        editor.commands.setContent(JSON.parse(finalContent));
      } catch (e) {
        editor.commands.setContent(finalContent);
      }
    } else if (mode === 'playback' && editor) {
      replayToIndex(currentIndex);
    }
  }, [mode, editor, finalContent, currentIndex, replayToIndex]);

  // Playback loop — advance one step per tick
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

  // Auto-scroll to caret position
  useEffect(() => {
    if (mode === 'playback' && contentRef.current) {
      const el = contentRef.current.querySelector('.ProseMirror');
      if (el) {
        // Scroll to the end of the content (where cursor is)
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [appliedIndex, mode]);

  const hasFinal = !!finalContent;
  const hasEvents = stepEvents.length > 0;

  if (!hasEvents && !hasFinal) {
    return <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">No data to display.</div>;
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

      {/* Editor content area with caret overlay */}
      <div ref={contentRef} className="relative min-h-[300px] max-h-[600px] overflow-y-auto">
        {mode === 'playback' && playing && (
          <div ref={caretRef} className="absolute w-0.5 h-5 bg-primary-600 animate-pulse z-10 pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
            }} />
        )}
        <div className="p-6">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}