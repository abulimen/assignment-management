import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Calendar, Clock, Activity } from 'lucide-react';

export default function EditTimeline({ events }) {
  const [view, setView] = useState('daily');

  const dailyData = useMemo(() => {
    if (!events?.length) return [];
    const groups = {};
    for (const e of events) {
      const date = new Date(e.occurred_at * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      groups[date] = (groups[date] || 0) + 1;
    }
    return Object.entries(groups).map(([date, count]) => ({ label: date, count }));
  }, [events]);

  const hourlyData = useMemo(() => {
    if (!events?.length) return [];
    const hours = Array(24).fill(0);
    for (const e of events) {
      const hour = new Date(e.occurred_at * 1000).getHours();
      hours[hour]++;
    }
    return hours.map((count, hour) => ({ label: `${hour}:00`, count, hour }));
  }, [events]);

  if (!events?.length) return null;

  const data = view === 'daily' ? dailyData : hourlyData;
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0047FF]" />
          <h3 className="text-sm font-bold text-[#1A1A1B]">Work Sessions</h3>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs font-mono font-bold bg-[#F9F8F6] p-0.5">
          <button
            onClick={() => setView('daily')}
            aria-pressed={view === 'daily'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              view === 'daily'
                ? 'bg-[#0047FF] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#1A1A1B]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Daily
          </button>
          <button
            onClick={() => setView('hourly')}
            aria-pressed={view === 'hourly'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
              view === 'hourly'
                ? 'bg-[#0047FF] text-white shadow-xs'
                : 'text-gray-600 hover:text-[#1A1A1B]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Hourly
          </button>
        </div>
      </div>

      <div
        role="img"
        aria-label={`Bar chart of edit counts by ${view === 'daily' ? 'day' : 'hour'}. Peak ${maxCount} edits; ${data.length} ${view === 'daily' ? 'days' : 'hours'} active.`}
      >
        <p className="sr-only">
          Peak {maxCount} edits; {data.length} {view === 'daily' ? 'days' : 'hours'} active
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
              interval={view === 'hourly' ? 1 : 0}
              angle={view === 'hourly' ? -45 : 0}
              textAnchor={view === 'hourly' ? 'end' : 'middle'}
              height={view === 'hourly' ? 50 : 30}
            />
            <YAxis tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'JetBrains Mono',
              }}
              formatter={(value) => [`${value} edits`, 'Events']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.count === maxCount ? '#0047FF' : '#93C5FD'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono text-gray-500 pt-2 border-t border-gray-100">
        <span>
          Peak: <strong className="text-[#1A1A1B]">{maxCount} edits</strong>
          {view === 'daily' ? ' on peak day' : ' in peak hour'}
        </span>
        <span>·</span>
        <span>
          {data.length} {view === 'daily' ? 'days' : 'hours'} recorded
        </span>
      </div>
    </div>
  );
}