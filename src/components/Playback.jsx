import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { Play, Pause, SkipBack, SkipForward, FileText, Film } from 'lucide-react';

export default function Playback({ events, finalContent }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState('playback'); // 'playback' | 'final'
  const intervalRef = useRef(null);

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

  // Find the most recent snapshot at or before a given index
  const findSnapshotBefore = useCallback((index) => {
    if (!events) return -1;
    for (let i = index; i >= 0; i--) {
      if (events[i]?.type === 'snapshot') return i;
    }
    return -1;
  }, [events]);

  // Apply a single event to the editor
  const applyEvent = useCallback((e) => {
    if (!editor) return;
    try {
      switch (e.type) {
        case 'snapshot':
          if (e.data.doc) editor.commands.setContent(e.data.doc);
          break;
        case 'keystroke':
          if (e.data.char) editor.commands.insertContentAt(e.data.position, e.data.char);
          break;
        case 'paste':
          if (e.data.text) editor.commands.insertContentAt(e.data.position, e.data.text);
          break;
        case 'delete':
          if (e.data.length) {
            const from = e.data.position;
            const to = Math.min(from + e.data.length, editor.state.doc.content.size);
            if (to > from) editor.commands.deleteRange({ from, to });
          }
          break;
        case 'cursor_jump':
          editor.commands.setTextSelection({ from: e.data.to, to: e.data.to });
          break;
        case 'format': {
          const { mark, from, to, active } = e.data;
          const safeTo = Math.min(to, editor.state.doc.content.size);
          if (safeTo > from) {
            if (active) editor.commands.addMark(mark, from, safeTo);
            else editor.commands.removeMark(mark, from, safeTo);
          }
          break;
        }
      }
    } catch (err) {
      // ponytail: skip out-of-range events. snapshot anchors prevent most drift.
    }
  }, [editor]);

  // Replay to a given index using snapshot anchoring
  const replayTo = useCallback((index) => {
    if (!editor || !events?.length) return;

    const snapshotIdx = findSnapshotBefore(index);
    if (snapshotIdx >= 0) {
      // Start from snapshot, replay forward
      editor.commands.setContent(events[snapshotIdx].data.doc || '');
      for (let i = snapshotIdx + 1; i <= index; i++) {
        applyEvent(events[i]);
      }
    } else {
      // No snapshot — replay from scratch
      editor.commands.clearContent();
      for (let i = 0; i <= index; i++) {
        applyEvent(events[i]);
      }
    }
  }, [editor, events, findSnapshotBefore, applyEvent]);

  // Update playback when index changes
  useEffect(() => {
    if (mode === 'playback') {
      replayTo(currentIndex);
    }
  }, [currentIndex, replayTo, mode]);

  // Show final document when mode switches
  useEffect(() => {
    if (mode === 'final' && editor && finalContent) {
      try {
        editor.commands.setContent(JSON.parse(finalContent));
      } catch (e) {
        editor.commands.setContent(finalContent);
      }
    } else if (mode === 'playback') {
      replayTo(currentIndex);
    }
  }, [mode, editor, finalContent, replayTo, currentIndex]);

  // Playback loop
  useEffect(() => {
    if (playing && events?.length) {
      const delay = 200 / speed;
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

        {/* Playback controls — only in playback mode */}
        {mode === 'playback' && hasEvents && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button onClick={() => setCurrentIndex(0)} className="p-1.5 rounded hover:bg-gray-200 text-gray-600"><SkipBack className="w-4 h-4" /></button>
              <button onClick={() => setPlaying(!playing)} className="p-1.5 rounded hover:bg-gray-200 text-gray-600">
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => setCurrentIndex(events.length - 1)} className="p-1.5 rounded hover:bg-gray-200 text-gray-600"><SkipForward className="w-4 h-4" /></button>
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
      <div className="p-6 min-h-[300px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
