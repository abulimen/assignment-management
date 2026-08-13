import { Clock, Keyboard, Gauge, FileText, Clipboard } from 'lucide-react';

// Compact effort snapshot: the handful of numbers a lecturer needs to judge
// "did they actually write this?" Deeper breakdowns live in the evidence fold.
export default function StatsBar({ stats }) {
  if (!stats) return null;

  const activeMs = stats.active_time_ms || stats.total_time_ms || 0;
  const activeMinutes = Math.round(activeMs / 60000);
  const timeDisplay = activeMinutes >= 60
    ? `${Math.floor(activeMinutes / 60)}h ${activeMinutes % 60}m`
    : `${activeMinutes}m`;

  const pastePct = (stats.paste_ratio || 0) * 100;

  const items = [
    { label: 'Words', value: (stats.word_count || 0).toLocaleString(), icon: <FileText className="w-4 h-4" /> },
    { label: 'Keystrokes', value: (stats.keystroke_count || 0).toLocaleString(), icon: <Keyboard className="w-4 h-4" /> },
    { label: 'Time spent', value: timeDisplay, icon: <Clock className="w-4 h-4" /> },
    { label: 'Typing speed', value: `${stats.avg_wpm || 0} wpm`, icon: <Gauge className="w-4 h-4" /> },
    { label: 'Pasted', value: `${pastePct.toFixed(0)}%`, icon: <Clipboard className="w-4 h-4" />, warn: pastePct > 30 },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
      {items.map(item => (
        <div key={item.label} className="bg-white rounded-xl border border-gray-200 px-3 py-3 flex items-center gap-3">
          <div className={`flex-shrink-0 ${item.warn ? 'text-orange-500' : 'text-gray-400'}`}>{item.icon}</div>
          <div className="min-w-0">
            <div className={`text-base font-semibold leading-tight ${item.warn ? 'text-orange-700' : 'text-gray-900'}`}>{item.value}</div>
            <div className="text-xs text-gray-500 truncate">{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
