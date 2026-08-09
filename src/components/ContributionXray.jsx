import { useMemo } from 'react';
import { Users, Clock, Keyboard, FileText } from 'lucide-react';

const AUTHOR_COLORS = [
  'rgba(59, 130, 246, 0.35)',  // blue
  'rgba(34, 197, 94, 0.35)',   // green
  'rgba(168, 85, 247, 0.35)',  // purple
  'rgba(249, 115, 22, 0.35)',  // orange
  'rgba(236, 72, 153, 0.35)',  // pink
  'rgba(14, 165, 233, 0.35)',  // sky
  'rgba(234, 179, 8, 0.35)',   // yellow
  'rgba(239, 68, 68, 0.35)',   // red
];

export default function ContributionXray({ sections }) {
  const contributors = useMemo(() => {
    if (!sections?.length) return [];
    return sections.map((s, i) => ({
      name: s.student_name || 'Unknown',
      title: s.title || 'Untitled',
      wordCount: s.word_count || 0,
      keystrokes: s.keystroke_count || 0,
      timeMs: s.total_time_ms || 0,
      color: AUTHOR_COLORS[i % AUTHOR_COLORS.length],
    }));
  }, [sections]);

  const totalWords = contributors.reduce((sum, c) => sum + c.wordCount, 0);

  if (contributors.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-semibold">Contribution X-Ray</h2>
      </div>

      {/* Stacked bar */}
      {totalWords > 0 && (
        <div className="flex h-8 rounded-lg overflow-hidden mb-4">
          {contributors.map((c, i) => {
            const pct = (c.wordCount / totalWords) * 100;
            if (pct === 0) return null;
            return (
              <div key={i} style={{ width: `${pct}%`, backgroundColor: c.color }}
                className="flex items-center justify-center text-xs font-medium text-gray-700 truncate"
                title={`${c.name}: ${c.wordCount} words (${pct.toFixed(1)}%)`}>
                {pct > 10 ? c.name.split(' ')[0] : ''}
              </div>
            );
          })}
        </div>
      )}

      {/* Per-student breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {contributors.map((c, i) => {
          const pct = totalWords > 0 ? (c.wordCount / totalWords) * 100 : 0;
          const minutes = Math.round(c.timeMs / 60000);
          return (
            <div key={i} className="border border-gray-200 rounded-lg p-3" style={{ borderLeft: `4px solid ${c.color.replace('0.35', '1')}` }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{c.title}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1 text-gray-500">
                  <FileText className="w-3 h-3" /> {c.wordCount}w
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Keyboard className="w-3 h-3" /> {c.keystrokes}k
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <Clock className="w-3 h-3" /> {minutes}m
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}