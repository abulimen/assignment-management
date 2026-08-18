import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { buildActivityRows, memberColor } from '../utils/insightsView';
import { Activity } from 'lucide-react';

export default function MemberActivityChart({ insights, members }) {
  const [view, setView] = useState('hourly');
  const list = members || [];

  const rows = useMemo(
    () => buildActivityRows(insights, list, view),
    [insights, list, view],
  );
  const hasData = rows.some((r) => list.some((m) => (r[m.student_name] || 0) > 0));

  const { summary } = useMemo(() => {
    if (!hasData || !rows.length) return { summary: '', busiest: '' };
    const perMember = list.map((m) => {
      const total = rows.reduce((s, r) => s + (r[m.student_name] || 0), 0);
      return `${m.student_name}: ${total}`;
    });
    const rowTotals = rows.map((r) => list.reduce((s, m) => s + (r[m.student_name] || 0), 0));
    const totalEdits = rowTotals.reduce((a, b) => a + b, 0);
    const peak = Math.max(...rowTotals);
    const busiestLabel = rows[rowTotals.indexOf(peak)]?.label || '';
    const unit = view === 'hourly' ? 'hour' : 'day';
    return {
      summary: `Bar chart of edits per member. ${perMember.join(', ')} edits; ${totalEdits} edits total; busiest ${unit}: ${busiestLabel}.`,
      busiest: busiestLabel,
    };
  }, [rows, list, view, hasData]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs mb-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0047FF]" />
          <h3 className="text-sm font-bold text-[#1A1A1B]">Edits per member</h3>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs font-mono font-bold bg-[#F9F8F6] p-0.5">
          {['hourly', 'daily'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`px-3 py-1.5 capitalize rounded-md transition-all cursor-pointer ${
                view === v
                  ? 'bg-[#0047FF] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#1A1A1B]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p className="text-xs text-gray-500 py-8 text-center font-mono">No editing activity recorded.</p>
      ) : (
        <div className="h-72" role="img" aria-label={summary}>
          <p className="sr-only">{summary}</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
                interval={view === 'hourly' ? 2 : 0}
                angle={view === 'daily' ? -30 : 0}
                textAnchor={view === 'daily' ? 'end' : 'middle'}
                height={view === 'daily' ? 48 : 30}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#6B7280', fontFamily: 'JetBrains Mono' }}
                allowDecimals={false}
                width={36}
              />
              <Tooltip
                cursor={{ fill: 'rgba(0, 71, 255, 0.04)' }}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', paddingTop: '10px' }} />
              {list.map((m, i) => (
                <Bar
                  key={m.student_id}
                  dataKey={m.student_name}
                  stackId="edits"
                  fill={memberColor(i)}
                  maxBarSize={24}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
