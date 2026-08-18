import { FileText, Clock, Clipboard } from 'lucide-react';

export default function StatsBar({ stats }) {
  if (!stats) return null;

  const activeMs = stats.active_time_ms || stats.total_time_ms || 0;
  const activeMinutes = Math.round(activeMs / 60000);
  const timeDisplay =
    activeMinutes >= 60
      ? `${Math.floor(activeMinutes / 60)}h ${activeMinutes % 60}m`
      : `${activeMinutes}m`;

  const pastePct = (stats.paste_ratio || 0) * 100;

  const items = [
    {
      label: 'Length',
      value: `${(stats.word_count || 0).toLocaleString()} words`,
      sub: stats.character_count ? `${stats.character_count.toLocaleString()} characters` : 'Total submission',
      icon: <FileText className="w-4 h-4 text-[#0047FF]" />,
    },
    {
      label: 'Time Spent',
      value: timeDisplay,
      sub: stats.avg_wpm ? `Avg ${stats.avg_wpm} WPM` : 'Active writing time',
      icon: <Clock className="w-4 h-4 text-[#0047FF]" />,
    },
    {
      label: 'Pasted Content',
      value: `${pastePct.toFixed(0)}%`,
      sub: pastePct > 0 ? 'Pasted text detected' : '100% typed directly',
      icon: <Clipboard className="w-4 h-4 text-[#0047FF]" />,
      warn: pastePct > 30,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-1.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 font-sans">{item.label}</span>
            <div className="w-7 h-7 rounded-lg bg-[#F9F8F6] border border-gray-200 flex items-center justify-center">
              {item.icon}
            </div>
          </div>
          <div
            className={`text-lg font-black font-mono tracking-tight ${
              item.warn ? 'text-amber-800' : 'text-[#1A1A1B]'
            }`}
          >
            {item.value}
          </div>
          <div className="text-[11px] text-gray-400 font-sans truncate">
            {item.sub}
          </div>
        </div>
      ))}
    </div>
  );
}

