import { Clock, Keyboard, Clipboard, Delete, MousePointer, Gauge, FileText } from 'lucide-react';

export default function StatsBar({ stats }) {
  if (!stats) return null;

  const activeMs = stats.active_time_ms || stats.total_time_ms || 0;
  const activeMinutes = Math.round(activeMs / 60000);
  const timeDisplay = activeMinutes >= 60
    ? `${Math.floor(activeMinutes / 60)}h ${activeMinutes % 60}m`
    : `${activeMinutes}m`;

  const items = [
    { label: 'Active Time', value: timeDisplay, icon: <Clock className="w-4 h-4" />, color: 'text-blue-600' },
    { label: 'Word Count', value: stats.word_count || 0, icon: <FileText className="w-4 h-4" />, color: 'text-indigo-600' },
    { label: 'Keystrokes', value: stats.keystroke_count || 0, icon: <Keyboard className="w-4 h-4" />, color: 'text-green-600' },
    { label: 'Avg WPM', value: stats.avg_wpm || 0, icon: <Gauge className="w-4 h-4" />, color: 'text-purple-600' },
    { label: 'Pastes', value: stats.paste_count || 0, icon: <Clipboard className="w-4 h-4" />, color: 'text-orange-600' },
    { label: 'Deletes', value: stats.delete_count || 0, icon: <Delete className="w-4 h-4" />, color: 'text-red-600' },
  ];

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
      {items.map(item => (
        <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
          <div className={`flex justify-center mb-1 ${item.color}`}>{item.icon}</div>
          <div className="text-lg font-bold text-gray-900">{item.value}</div>
          <div className="text-xs text-gray-500">{item.label}</div>
        </div>
      ))}
      <div className="col-span-3 md:col-span-6 bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Paste Ratio:</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div className="bg-orange-400 h-2 rounded-full" style={{ width: `${Math.min((stats.paste_ratio || 0) * 100, 100)}%` }} />
          </div>
          <span className="text-sm font-medium text-gray-700">{((stats.paste_ratio || 0) * 100).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}