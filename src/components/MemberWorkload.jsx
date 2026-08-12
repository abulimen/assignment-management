import { useMemo } from 'react';
import { Users, Clock, PenLine, ClipboardPaste } from 'lucide-react';
import { heatmapMatrix, memberColor } from '../utils/insightsView';

// Workload at a glance: how much each member typed vs pasted, their sessions
// and active time, plus a 24-hour activity heatmap showing when each worked.
export default function MemberWorkload({ insights, members }) {
  const list = members || [];
  const heat = useMemo(() => heatmapMatrix(insights, list), [insights, list]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-primary-600" />
        <h3 className="font-semibold">Member workload</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
              <th className="py-2 pr-3 font-medium">Member</th>
              <th className="py-2 px-3 font-medium">Typed</th>
              <th className="py-2 px-3 font-medium">Pasted</th>
              <th className="py-2 px-3 font-medium">Sessions</th>
              <th className="py-2 px-3 font-medium">Active time</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m, i) => {
              const s = insights?.[String(m.student_id)]?.summary || {};
              const typed = s.typed_chars || 0;
              const pasted = s.pasted_chars || 0;
              const total = typed + pasted;
              return (
                <tr key={m.student_id} className="border-b border-gray-100">
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: memberColor(i) }} />
                      {m.student_name}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1.5 text-gray-700">
                      <PenLine className="w-3.5 h-3.5 text-green-600" /> {typed.toLocaleString()}
                    </span>
                    {total > 0 && <MiniBar pct={(typed / total) * 100} color="oklch(0.6 0.17 150)" />}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1.5 text-gray-700">
                      <ClipboardPaste className="w-3.5 h-3.5 text-red-500" /> {pasted.toLocaleString()}
                    </span>
                    {total > 0 && <MiniBar pct={(pasted / total) * 100} color="oklch(0.55 0.19 25)" />}
                  </td>
                  <td className="py-2.5 px-3 text-gray-700">{s.sessions || 0}</td>
                  <td className="py-2.5 px-3 text-gray-700">
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" /> {formatDuration(s.active_seconds || 0)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h4 className="text-sm font-semibold text-gray-700 mt-5 mb-2">When each member worked</h4>
      <div className="space-y-1.5 overflow-x-auto">
        {heat.members.map((name, i) => (
          <div key={name} className="flex items-center gap-2">
            <span className="w-24 text-xs text-gray-500 flex-shrink-0 truncate">{name}</span>
            <div className="flex gap-[3px]">
              {heat.cells[i].map((n, h) => {
                const alpha = n === 0 ? 0.05 : 0.2 + 0.75 * (n / Math.max(heat.max, 1));
                return (
                  <div key={h} title={`${name} — ${String(h).padStart(2, '0')}:00 · ${n} edit${n === 1 ? '' : 's'}`}
                    className="w-[18px] h-[18px] rounded-[3px]"
                    style={{ backgroundColor: `oklch(0.45 0.12 265 / ${alpha})` }} />
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1">
          <span className="w-24 flex-shrink-0" />
          <div className="flex gap-[3px] text-[9px] text-gray-400 w-full justify-between pr-1">
            <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ pct, color }) {
  return (
    <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function formatDuration(seconds) {
  if (!seconds) return '0m';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
