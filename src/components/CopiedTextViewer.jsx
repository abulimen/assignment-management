import { useMemo, useState } from 'react';
import { ClipboardPaste, Link2, ChevronDown, ChevronUp, CheckCircle2, PenLine } from 'lucide-react';
import { filterPastes, memberColor } from '../utils/insightsView';

// Copied-text inspector: every external paste per member, whether it survived
// to submission or was rewritten, its links, and a toggle to hide link-only
// pastes (bare citations, usually benign).
export default function CopiedTextViewer({ insights, members }) {
  const list = members || [];
  const [memberFilter, setMemberFilter] = useState('all');
  const [hideLinkOnly, setHideLinkOnly] = useState(false);
  const [survival, setSurvival] = useState('all'); // all | survived | rewritten
  const [expanded, setExpanded] = useState(null);

  const rows = useMemo(() => {
    const out = [];
    list.forEach((m, i) => {
      if (memberFilter !== 'all' && String(m.student_id) !== memberFilter) return;
      const pastes = insights?.[String(m.student_id)]?.pastes || [];
      for (const p of filterPastes(pastes, {
        hideLinkOnly,
        survival: survival === 'all' ? null : survival,
      })) {
        out.push({ ...p, member: m, color: memberColor(i) });
      }
    });
    return out.sort((a, b) => a.ts - b.ts);
  }, [insights, list, memberFilter, hideLinkOnly, survival]);

  const totalPastes = useMemo(
    () => list.reduce((s, m) => s + (insights?.[String(m.student_id)]?.pastes?.length || 0), 0),
    [insights, list],
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-4 h-4 text-red-500" />
          <h3 className="font-semibold">Copied text ({rows.length}{rows.length !== totalPastes ? ` of ${totalPastes}` : ''})</h3>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={hideLinkOnly} onChange={(e) => setHideLinkOnly(e.target.checked)}
            className="rounded border-gray-300" />
          Hide link-only pastes
        </label>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm">
          <option value="all">All members</option>
          {list.map((m) => (
            <option key={m.student_id} value={String(m.student_id)}>{m.student_name}</option>
          ))}
        </select>

        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          {[['all', 'All'], ['survived', 'Still there'], ['rewritten', 'Rewritten']].map(([v, label]) => (
            <button key={v} onClick={() => setSurvival(v)}
              className={`px-3 py-1.5 ${survival === v ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          {totalPastes === 0 ? 'No external pastes recorded.' : 'No pastes match the current filters.'}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((p, idx) => {
            const key = `${p.member.student_id}-${p.sequence ?? idx}`;
            const open = expanded === key;
            return (
              <div key={key} className="border border-gray-200 rounded-lg overflow-hidden">
                <button onClick={() => setExpanded(open ? null : key)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-sm font-medium flex-shrink-0">{p.member.student_name}</span>
                  <span className="flex-1 text-sm text-gray-500 truncate">{p.text}</span>
                  {p.links.length > 0 && (
                    <span className="flex items-center gap-1 text-xs text-blue-600 flex-shrink-0">
                      <Link2 className="w-3.5 h-3.5" /> {p.links.length}
                    </span>
                  )}
                  <span className={`flex items-center gap-1 text-xs flex-shrink-0 ${p.survived ? 'text-red-600' : 'text-green-600'}`}>
                    {p.survived
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> kept</>
                      : <><PenLine className="w-3.5 h-3.5" /> rewritten</>}
                  </span>
                  {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {open && (
                  <div className="px-4 pb-3 pt-1 border-t border-gray-100">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words bg-gray-50 rounded-lg p-3 font-sans">{p.text}</pre>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                      <span>{p.len} chars pasted</span>
                      <span>{p.deleted} chars later deleted</span>
                      <span>{new Date(p.ts * 1000).toLocaleString()}</span>
                    </div>
                    {p.links.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {p.links.map((l) => (
                          <a key={l} href={l} target="_blank" rel="noreferrer"
                            className="block text-xs text-blue-600 underline truncate">{l}</a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
