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
import { Section, SectionTitle } from '../extensions/Section';
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

  // Shrink pasted ranges that overlap a deletion — deleted chars are gone
  markDeleted(delFrom, delTo) {
    const newRanges = [];
    for (const r of this.ranges) {
      if (r.type === 'pasted' && delFrom < r.to && delTo > r.from) {
        // Delete overlaps this pasted range — split it, keep surviving portions as 'pasted'
        if (delFrom > r.from) {
          newRanges.push({ from: r.from, to: delFrom, type: 'pasted' });
        }
        if (delTo < r.to) {
          newRanges.push({ from: delTo, to: r.to, type: 'pasted' });
        }
        // The deleted portion is simply removed — no longer exists
      } else {
        newRanges.push(r);
      }
    }
    this.ranges = newRanges;
  }

  // Check if a position falls inside a pasted range
  isInPastedRange(pos) {
    for (const r of this.ranges) {
      if (pos >= r.from && pos < r.to && r.type === 'pasted') {
        return true;
      }
    }
    return false;
  }

  // Generate ProseMirror inline decorations for all ranges.
  // ONLY highlights ranges where characters actually exist in doc.
  // Never places decorations on structural/block boundaries.
  getDecorations(state) {
    const decos = [];
    const docSize = state.doc.content.size;

    for (const r of this.ranges) {
      if (r.from >= docSize || r.to <= 0) continue;
      const start = Math.max(0, r.from);
      const end = Math.min(docSize, r.to);
      if (start >= end) continue;

      const cls = r.type === 'typed' ? 'hl-typed'
                : r.type === 'pasted' ? 'hl-pasted'
                : 'hl-edited';
      const label = r.type === 'typed' ? 'Typed'
                  : r.type === 'pasted' ? 'Pasted from external source'
                  : 'Edited / Modified';

      // Iterate through text nodes in range to avoid block-boundary decorations
      try {
        state.doc.nodesBetween(start, end, (node, pos) => {
          if (node.isText) {
            const nodeFrom = Math.max(start, pos);
            const nodeTo = Math.min(end, pos + node.nodeSize);
            if (nodeFrom < nodeTo) {
              decos.push(
                Decoration.inline(nodeFrom, nodeTo, {
                  class: cls,
                  'data-source': r.type,
                  'data-label': label,
                })
              );
            }
          }
        });
      } catch (e) {
        // Fallback: safe single decoration if within doc
        if (start < end && end <= docSize) {
          decos.push(
            Decoration.inline(start, end, {
              class: cls,
              'data-source': r.type,
              'data-label': label,
            })
          );
        }
      }
    }
    return decos;
  }
}

const PLAYBACK_EXTENSIONS = [
  StarterKit.configure({ history: false }),
  Underline,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Link.configure({ openOnClick: false }),
  Section,
  SectionTitle,
];
const PLAYBACK_EDITOR_PROPS = {
  attributes: { class: 'word-document focus:outline-none' },
};

export default function Playback({
  events,
  finalContent,
  initialData,
  mode: propMode,
  initialMode,
  highlightPasted,
  externalHighlight,
  seekStepIndex,
  onSeekHandled,
}) {
  const resolvedEvents = events || initialData?.events || [];
  const resolvedFinalContent = finalContent || initialData?.content;
  const activeMode = propMode || initialMode || (resolvedFinalContent ? 'final' : 'playback');
  const activeHighlight = highlightPasted !== undefined ? highlightPasted : (externalHighlight !== undefined ? externalHighlight : false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState(activeMode);
  const [highlight, setHighlight] = useState(activeHighlight);
  const intervalRef = useRef(null);
  const contentRef = useRef(null);
  const isDispatching = useRef(false);
  const lastIndexRef = useRef(-1);

  // Sync mode if prop changes
  useEffect(() => {
    if (activeMode) setMode(activeMode);
  }, [activeMode]);

  // Sync highlight if prop changes
  useEffect(() => {
    setHighlight(activeHighlight);
  }, [activeHighlight]);

  // SourceMap instance — tracks typed/pasted/edited ranges
  const sourceMap = useRef(new SourceMap());
  const highlightRef = useRef(false);

  useEffect(() => { highlightRef.current = highlight; }, [highlight]);

  const stepEvents = useMemo(
    () => {
      const list = (resolvedEvents || []).filter(e => e.steps && e.steps.length > 0);
      return list.slice().sort((a, b) => (Number(a.occurred_at) || 0) - (Number(b.occurred_at) || 0));
    },
    [resolvedEvents]
  );

  // Seek to specific step index when requested from ProcessTimeline
  useEffect(() => {
    if (seekStepIndex != null && stepEvents.length > 0) {
      setPlaying(false);
      setMode('playback');
      const targetIdx = Math.max(0, Math.min(seekStepIndex, stepEvents.length - 1));
      setCurrentIndex(targetIdx);
      onSeekHandled?.();
    }
  }, [seekStepIndex, stepEvents.length, onSeekHandled]);

  // Replay must start from the SAME document shape the recording was made
  // against, or every recorded position is out of range and nothing renders.
  const seedContent = useMemo(() => {
    if (!resolvedFinalContent) return null;
    try {
      const parsed = typeof resolvedFinalContent === 'string' ? JSON.parse(resolvedFinalContent) : resolvedFinalContent;
      if (parsed?.content?.[0]?.type === 'section') {
        return JSON.stringify({
          type: 'doc',
          content: [{
            type: 'section',
            attrs: parsed.content[0].attrs || {},
            content: [{ type: 'sectionTitle' }, { type: 'paragraph' }],
          }],
        });
      }
    } catch { /* fall through to flat seed */ }
    return null;
  }, [resolvedFinalContent]);

  const editor = useEditor({
    extensions: PLAYBACK_EXTENSIONS,
    content: '',
    editable: false,
    editorProps: PLAYBACK_EDITOR_PROPS,
  });

  // Decoration plugin: cursor caret + source highlighting
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

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
    return () => {
      if (!editor.isDestroyed) editor.unregisterPlugin(plugin.key);
    };
  }, [editor]);

  // Apply a single step event + update source map
  const applyStepEvent = useCallback((event) => {
    if (!editor || editor.isDestroyed || !event?.steps) return;

    const { state } = editor.view;
    let tr = state.tr;

    for (const stepJson of event.steps) {
      try {
        const step = Step.fromJSON(state.schema, stepJson);
        tr = tr.step(step);
      } catch (e) { /* skip invalid */ }
    }

    // Update source map BEFORE dispatching
    sourceMap.current.mapRanges(tr.mapping);

    // Process each step in the event
    for (const stepJson of event.steps) {
      if (stepJson.stepType === 'replace') {
        const from = stepJson.from ?? 0;
        const to = stepJson.to ?? 0;
        const deleted = to - from;

        // If characters were deleted, shrink overlapping pasted ranges
        if (deleted > 0) {
          sourceMap.current.markDeleted(from, to);
        }

        // Check if slice content was inserted
        const sliceContent = stepJson.slice?.content;
        if (sliceContent && sliceContent.length > 0) {
          const insertedSize = getSliceContentSize(sliceContent);
          const isPasted = event.type === 'paste';
          const isEditingPasted = !isPasted && sourceMap.current.isInPastedRange(from);
          const type = isPasted ? 'pasted'
                     : isEditingPasted ? 'edited'
                     : 'typed';
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
    if (!editor || editor.isDestroyed) return;
    sourceMap.current.reset();
    isDispatching.current = true;
    if (seedContent) {
      try { editor.commands.setContent(JSON.parse(seedContent)); }
      catch { editor.commands.clearContent(); }
    } else {
      editor.commands.clearContent();
    }
    isDispatching.current = false;
    for (let i = 0; i <= index && i < stepEvents.length; i++) {
      applyStepEvent(stepEvents[i]);
    }
    lastIndexRef.current = index;
  }, [editor, stepEvents, applyStepEvent, seedContent]);

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

  // Switch between final document and playback mode
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (mode === 'final') {
      if (stepEvents.length > 0) {
        rebuildToIndex(stepEvents.length - 1);
      } else if (resolvedFinalContent) {
        isDispatching.current = true;
        try { editor.commands.setContent(JSON.parse(resolvedFinalContent)); }
        catch (e) { editor.commands.setContent(resolvedFinalContent); }
        isDispatching.current = false;
        lastIndexRef.current = -1;
        sourceMap.current.reset();
      }
    } else if (mode === 'playback') {
      if (lastIndexRef.current === -1 || lastIndexRef.current === stepEvents.length - 1) {
        rebuildToIndex(currentIndex);
      }
    }
  }, [mode, editor, resolvedFinalContent, currentIndex, stepEvents.length, rebuildToIndex]);

  // Force decoration re-evaluation when highlight toggles
  useEffect(() => {
    if (editor && !editor.isDestroyed && !isDispatching.current) {
      isDispatching.current = true;
      editor.view.dispatch(editor.state.tr);
      isDispatching.current = false;
    }
  }, [highlight, editor]);

  // Playback timer
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

  const hasFinal = !!resolvedFinalContent;
  const hasEvents = stepEvents.length > 0;

  if (!hasEvents && !hasFinal) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-center text-gray-500 font-sans text-xs">
        No document content or keystroke events recorded for this submission.
      </div>
    );
  }

  return (
    <div className="word-editor word-editor-readonly flex-1 flex flex-col h-full overflow-hidden">
      {/* Replay Control Bar */}
      {hasEvents && mode === 'playback' && (
        <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-col gap-2 shrink-0 z-10 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Step Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setPlaying(false);
                  setCurrentIndex(0);
                }}
                aria-label="Skip to start"
                className="p-1.5 min-h-8 min-w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPlaying(!playing)}
                aria-label={playing ? 'Pause playback' : 'Play'}
                className="p-1.5 min-h-8 min-w-8 flex items-center justify-center rounded-lg bg-[#0047FF] hover:bg-[#0038CC] text-white shadow-xs transition-transform active:scale-95 cursor-pointer"
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button
                onClick={() => {
                  setPlaying(false);
                  setCurrentIndex(stepEvents.length - 1);
                }}
                aria-label="Skip to end"
                className="p-1.5 min-h-8 min-w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Scrubber Range Input */}
            <div className="relative flex flex-1 items-center min-w-[140px]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 right-0 h-1.5 rounded-full bg-gray-200"
              />
              <input
                type="range"
                min={0}
                max={Math.max(stepEvents.length - 1, 0)}
                value={currentIndex}
                onChange={(e) => {
                  setPlaying(false);
                  setCurrentIndex(parseInt(e.target.value));
                }}
                aria-label="Replay progress"
                className="relative w-full h-6 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#0047FF] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#0047FF]"
              />
            </div>

            {/* Speeds */}
            <div className="flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              {[0.5, 1, 2, 4, 8, 16, 32].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition-all cursor-pointer ${
                    speed === s ? 'bg-[#0047FF] text-white shadow-2xs' : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Time & Legend Sub-bar */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono">
            <div className="flex items-center gap-2">
              <span>Step {currentIndex + 1} of {stepEvents.length}</span>
              {(() => {
                const e = stepEvents[currentIndex];
                if (!e?.occurred_at) return null;
                const time = new Date(e.occurred_at * 1000).toLocaleTimeString();
                const firstOccurred = Number(stepEvents[0]?.occurred_at) || 0;
                const currOccurred = Number(e.occurred_at) || 0;
                const elapsed = Math.max(0, currOccurred - firstOccurred);
                const elapsedSec = Math.round(elapsed);
                const elapsedStr = elapsedSec >= 60
                  ? `${Math.floor(elapsedSec / 60)}m ${elapsedSec % 60}s`
                  : `${elapsedSec}s`;
                return (
                  <>
                    <span className="text-gray-300">·</span>
                    <span>{time}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-700">+{elapsedStr}</span>
                  </>
                );
              })()}
            </div>

            {highlight && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800">
                  <span className="w-2 h-2 rounded-xs bg-green-200 border border-green-500" />
                  Typed
                </span>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-800">
                  <span className="w-2 h-2 rounded-xs bg-red-200 border border-red-500" />
                  Pasted
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Realistic Word Document Canvas */}
      <div ref={contentRef} className="word-canvas flex-1">
        <div className="word-sheet-wrap">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

// Compute ProseMirror content size from a JSON slice content array.
function getSliceContentSize(content) {
  if (!content || !Array.isArray(content)) return 0;
  let size = 0;
  for (const node of content) {
    if (node.text) {
      size += node.text.length;
    } else if (node.content) {
      size += 2 + getSliceContentSize(node.content);
    }
  }
  return size;
}
