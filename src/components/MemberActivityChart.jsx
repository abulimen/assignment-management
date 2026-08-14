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

  // Plain-text picture of the chart for screen readers (Recharts SVG is not
  // accessible on its own).
  const { summary, busiest } = useMemo(() => {
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
    <div className="bg-surface rounded-xl border border-line p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary-600" />
          <h3 className="font-semibold">Edits per member</h3>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {['hourly', 'daily'].map((v) => (
            <button key={v} onClick={() => setView(v)} aria-pressed={view === v}
              className={`px-3 min-h-11 capitalize ${view === v ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p className="text-sm text-gray-600 py-8 text-center">No editing activity recorded.</p>
      ) : (
        <div className="h-72" role="img" aria-label={summary}>
          <p className="sr-only">{summary}</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }}
                interval={view === 'hourly' ? 2 : 0} angle={view === 'daily' ? -30 : 0}
                textAnchor={view === 'daily' ? 'end' : 'middle'} height={view === 'daily' ? 48 : 30} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={36} />
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
