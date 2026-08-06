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

// ProseMirror Step Replay with source highlighting.
// Uses ProseMirror content size (not text length) for range bounds,
// and tr.mapping for position tracking through document changes.

// SourceMap: tracks which doc ranges are typed/pasted/edited.
// All positions are ProseMirror positions (include structural tokens).
class SourceMap {
  constructor() {
    this.ranges = []; // [{from, to, type: 'typed'|'pasted'|'edited'}]
  }

  reset() {
    this.ranges = [];
  }

  // Map all range positions through a transaction's mapping
  mapRanges(mapping) {
    this.ranges = this.ranges.map(r => ({
      ...r,
      from: mapping.map(r.from, -1),
      to: mapping.map(r.to, 1),
    })).filter(r => r.from < r.to);
  }

  // Add a new range. If it overlaps existing ranges, split/merge them.
  addRange(from, to, type) {
    if (to <= from) return;
    const newRanges = [];
    let inserted = false;
    for (const r of this.ranges) {
      if (r.to <= from) {
        newRanges.push(r);
      } else if (r.from >= to) {
        if (!inserted) {
          newRanges.push({ from, to, type });
          inserted = true;
        }
        newRanges.push(r);
      } else {
        // Overlap — split existing range
        if (r.from < from) {
          newRanges.push({ from: r.from, to: from, type: r.type });
        }
        if (!inserted) {
          newRanges.push({ from, to, type });
          inserted = true;
        }
        if (r.to > to) {
          newRanges.push({ from: to, to: r.to, type: r.type });
        }
      }
    }
    if (!inserted) {
      newRanges.push({ from, to, type });
    }
    this.ranges = newRanges.sort((a, b) => a.from - b.from);
  }

  // Mark pasted ranges overlapping a deletion as 'edited'
  markDeleted(delFrom, delTo) {
    for (const r of this.ranges) {
      if (r.type === 'pasted' && delFrom < r.to && delTo > r.from) {
        r.type = 'edited';
      }
    }
  }

  // Check if a position falls inside a pasted or edited range
  isInPastedRange(pos) {
    for (const r of this.ranges) {
      if (pos >= r.from && pos < r.to && (r.type === 'pasted' || r.type === 'edited')) {
        return true;
      }
    }
    return false;
  }

  // Generate ProseMirror decorations for the current ranges
  getDecorations(state) {
    const decos = [];
    for (const r of this.ranges) {
      const safeFrom = Math.max(0, Math.min(r.from, state.doc.content.size));
      const safeTo = Math.max(safeFrom, Math.min(r.to, state.doc.content.size));
      if (safeTo > safeFrom) {
        const cls = r.type === 'typed' ? 'hl-typed'
                  : r.type === 'edited' ? 'hl-edited'
                  : 'hl-pasted';
        decos.push(Decoration.inline(safeFrom, safeTo, { class: cls }));
      }
    }
    return decos;
  }
}

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

  // SourceMap instance — tracks typed/pasted/edited ranges
  const sourceMap = useRef(new SourceMap());
  const highlightRef = useRef(false);

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

  // Decoration plugin: cursor caret + source highlighting
  useEffect(() => {
    if (!editor) return;

    const plugin = new Plugin({
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
            decos.push(...sourceMap.current.getDecorations(state));
          }

          return DecorationSet.create(state.doc, decos);
        },
      },
    });

    editor.registerPlugin(plugin);
    return () => { editor.unregisterPlugin(plugin.key); };
  }, [editor]);

  // Apply a single step event + update source map
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

    // Update source map BEFORE dispatching
    // Map existing ranges through this transaction's mapping
    sourceMap.current.mapRanges(tr.mapping);

    // Process each step in the event
    for (const stepJson of event.steps) {
      if (stepJson.stepType === 'replace') {
        const from = stepJson.from ?? 0;
        const to = stepJson.to ?? 0;
        const deleted = to - from;

        // Compute inserted size using ProseMirror content size
        // (NOT text length — includes paragraph boundary tokens)
        let insertedSize = 0;
        if (stepJson.slice?.content) {
          insertedSize = getSliceContentSize(stepJson.slice.content);
        }

        if (insertedSize > 0 && deleted === 0) {
          // Pure insertion
          const type = (event.type === 'paste' && event.data?.external_paste)
                     ? 'pasted' : 'typed';
          sourceMap.current.addRange(from, from + insertedSize, type);
        } else if (deleted > 0 && insertedSize === 0) {
          // Pure deletion — mark overlapping pasted ranges as edited
          sourceMap.current.markDeleted(from, to);
        } else if (deleted > 0 && insertedSize > 0) {
          // Replace (delete then insert): user selected text and typed over it.
          // If the deleted range was inside a pasted/edited block, the replacement
          // text is an EDIT, not fresh typing. Mark it as 'edited' (yellow).
          sourceMap.current.markDeleted(from, to);
          const wasInPasted = sourceMap.current.isInPastedRange(from);
          const type = (event.type === 'paste' && event.data?.external_paste)
                     ? 'pasted'
                     : wasInPasted ? 'edited' : 'typed';
          sourceMap.current.addRange(from, from + insertedSize, type);
        }
      }
    }

    // Set selection
    if (event.selection?.from != null) {
      const selFrom = Math.min(event.selection.from, tr.doc.content.size);
      try {
        const resolved = tr.doc.resolve(selFrom);
        if (resolved.parent.isTextblock) {
          tr = tr.setSelection(TextSelection.create(tr.doc, selFrom));
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
    sourceMap.current.reset();
    isDispatching.current = true;
    editor.commands.clearContent();
    isDispatching.current = false;
    for (let i = 0; i <= index && i < stepEvents.length; i++) {
      applyStepEvent(stepEvents[i]);
    }
    lastIndexRef.current = index;
  }, [editor, stepEvents, applyStepEvent]);

  // Reset when events change
  useEffect(() => {
    lastIndexRef.current = -1;
    sourceMap.current.reset();
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
      sourceMap.current.reset();
    } else if (mode === 'playback' && editor && lastIndexRef.current === -1) {
      rebuildToIndex(currentIndex);
    }
  }, [mode, editor, finalContent, currentIndex, rebuildToIndex]);

  // Force decoration re-evaluation when highlight toggles
  useEffect(() => {
    if (editor && !isDispatching.current) {
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

// Compute ProseMirror content size from a JSON slice content array.
// Text nodes: text.length
// Block nodes (paragraph, heading, etc.): 2 (open/close) + children sizes
// This gives the EXACT ProseMirror position count, including structural tokens.
function getSliceContentSize(content) {
  if (!content || !Array.isArray(content)) return 0;
  let size = 0;
  for (const node of content) {
    if (node.text) {
      size += node.text.length;
    } else if (node.content) {
      // Block node: open tag (1) + close tag (1) + children
      size += 2 + getSliceContentSize(node.content);
    }
  }
  return size;
}