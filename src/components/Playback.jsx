import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export default function Playback({ events }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const intervalRef = useRef(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
  });

  const replayTo = useCallback((index) => {
    if (!editor || !events?.length) return;
    editor.commands.clearContent();
    for (let i = 0; i <= index && i < events.length; i++) {
      const e = events[i];
      if (e.type === 'keystroke' && e.data.char) {
        editor.commands.insertContentAt(e.data.position, e.data.char);
      } else if (e.type === 'paste' && e.data.text) {
        editor.commands.insertContentAt(e.data.position, e.data.text);
      }
    }
  }, [editor, events]);

  useEffect(() => {
    replayTo(currentIndex);
  }, [currentIndex, replayTo]);

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

  if (!events?.length) {
    return <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">No events to replay.</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 p-3">
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
      </div>
      <div className="p-6 min-h-[300px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}