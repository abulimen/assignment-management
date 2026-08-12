import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { buildActivityRows, memberColor } from '../utils/insightsView';
import { Activity } from 'lucide-react';

// Per-member editing volume over time — stacked bars, hourly or daily.
export default function MemberActivityChart({ insights, members }) {
  const [view, setView] = useState('hourly');
  const list = members || [];

  const rows = useMemo(
    () => buildActivityRows(insights, list, view),
    [insights, list, view],
  );
  const hasData = rows.some((r) => list.some((m) => (r[m.student_name] || 0) > 0));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold">Edits per member</h3>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {['hourly', 'daily'].map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 capitalize ${view === v ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p className="text-sm text-gray-400 py-8 text-center">No editing activity recorded.</p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }}
                interval={view === 'hourly' ? 2 : 0} angle={view === 'daily' ? -30 : 0}
                textAnchor={view === 'daily' ? 'end' : 'middle'} height={view === 'daily' ? 48 : 30} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {list.map((m, i) => (
                <Bar key={m.student_id} dataKey={m.student_name} stackId="edits"
                  fill={memberColor(i)} maxBarSize={26} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
