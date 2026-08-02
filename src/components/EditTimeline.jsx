import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Calendar, Clock } from 'lucide-react';

export default function EditTimeline({ events }) {
  const [view, setView] = useState('daily'); // 'daily' | 'hourly'

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
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Edit Activity Timeline</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView('daily')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              view === 'daily' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" /> Daily
          </button>
          <button
            onClick={() => setView('hourly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              view === 'hourly' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Hourly
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            interval={view === 'hourly' ? 1 : 0}
            angle={view === 'hourly' ? -45 : 0}
            textAnchor={view === 'hourly' ? 'end' : 'middle'}
            height={view === 'hourly' ? 50 : 30}
          />
          <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value} edits`, 'Events']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.count === maxCount ? '#3b82f6' : '#93c5fd'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span>Peak: {maxCount} edits{view === 'daily' ? ' on busiest day' : ' in busiest hour'}</span>
        <span>·</span>
        <span>{data.length} {view === 'daily' ? 'days' : 'hours'} active</span>
      </div>
    </div>
  );
}