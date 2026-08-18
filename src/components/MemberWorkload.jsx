import { useMemo } from 'react';
import { Users, Clock, PenLine, ClipboardPaste } from 'lucide-react';
import { heatmapMatrix, memberColor } from '../utils/insightsView';

export default function MemberWorkload({ insights, members }) {
  const list = members || [];
  const heat = useMemo(() => heatmapMatrix(insights, list), [insights, list]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs mb-6 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <Users className="w-4 h-4 text-[#0047FF]" />
        <h3 className="text-sm font-bold text-[#1A1A1B]">Member workload</h3>
      </div>

      <div className="overflow-x-auto" role="region" aria-label="Member workload table" tabIndex={0}>
        <table className="w-full text-xs font-mono">
          <caption className="sr-only">
            Member workload: typed characters, pasted characters, sessions, and active time for each member.
          </caption>
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100 uppercase tracking-wider text-[10px]">
              <th className="py-2.5 pr-3 font-semibold">Member</th>
              <th className="py-2.5 px-3 font-semibold">Typed Characters</th>
              <th className="py-2.5 px-3 font-semibold">Pasted Characters</th>
              <th className="py-2.5 px-3 font-semibold">Draft Sessions</th>
              <th className="py-2.5 px-3 font-semibold">Active Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-sans">
            {list.map((m, i) => {
              const s = insights?.[String(m.student_id)]?.summary || {};
              const typed = s.typed_chars || 0;
              const pasted = s.pasted_chars || 0;
              const total = typed + pasted;
              return (
                <tr key={m.student_id} className="hover:bg-[#F9F8F6] transition-colors">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: memberColor(i) }}
                      />
                      <span className="font-bold text-[#1A1A1B]">{m.student_name}</span>
                      {m.student_matric && (
                        <span className="text-[10px] font-mono text-gray-600 bg-gray-100 px-1.5 py-0.2 rounded border border-gray-200">
                          {m.student_matric}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="flex items-center gap-1.5 font-mono text-[#1A1A1B]">
                      <PenLine className="w-3.5 h-3.5 text-emerald-600" /> {typed.toLocaleString()}
                    </span>
                    {total > 0 && <MiniBar pct={(typed / total) * 100} color="#059669" />}
                  </td>
                  <td className="py-3 px-3">
                    <span className="flex items-center gap-1.5 font-mono text-[#1A1A1B]">
                      <ClipboardPaste className="w-3.5 h-3.5 text-amber-600" /> {pasted.toLocaleString()}
                    </span>
                    {total > 0 && <MiniBar pct={(pasted / total) * 100} color="#D97706" />}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#1A1A1B]">{s.sessions || 0}</td>
                  <td className="py-3 px-3 font-mono text-[#1A1A1B]">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" /> {formatDuration(s.active_seconds || 0)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pt-2">
        <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-700 mb-2.5">
          Hourly Activity Distribution (24-Hour Heatmap)
        </h4>
        <div
          className="space-y-1.5 overflow-x-auto p-3 bg-[#F9F8F6] rounded-xl border border-gray-200"
          role="img"
          aria-label="Activity heatmap by hour for each member"
        >
          {heat.members.map((name, i) => (
            <div key={name} className="flex items-center gap-2">
              <span className="w-24 text-[11px] text-gray-600 font-bold shrink-0 truncate">{name}</span>
              <div className="flex gap-[2px]">
                {heat.cells[i].map((n, h) => {
                  const alpha = n === 0 ? 0.08 : 0.25 + 0.75 * (n / Math.max(heat.max, 1));
                  return (
                    <div
                      key={h}
                      title={`${name} — ${String(h).padStart(2, '0')}:00 · ${n} edit${n === 1 ? '' : 's'}`}
                      className="w-3.5 h-3.5 rounded-[2px]"
                      style={{ backgroundColor: `rgba(0, 71, 255, ${alpha})` }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-1">
            <span className="w-24 shrink-0" />
            <div className="flex gap-[1px] font-mono text-[9px] text-gray-400 w-full justify-between pr-1">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBar({ pct, color }) {
  return (
    <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
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
