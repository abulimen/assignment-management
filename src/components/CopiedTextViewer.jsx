import { useMemo, useState } from 'react';
import { ClipboardPaste, Link2, ChevronDown, ChevronUp, CheckCircle2, PenLine } from 'lucide-react';
import { filterPastes, memberColor } from '../utils/insightsView';

export default function CopiedTextViewer({ insights, members }) {
  const list = members || [];
  const [memberFilter, setMemberFilter] = useState('all');
  const [hideLinkOnly, setHideLinkOnly] = useState(false);
  const [survival, setSurvival] = useState('all');
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
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-xs mb-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-[#1A1A1B]">
            External Pastes & Retained Text ({rows.length}
            {rows.length !== totalPastes ? ` of ${totalPastes}` : ''})
          </h3>
        </div>

        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none font-sans">
          <input
            type="checkbox"
            checked={hideLinkOnly}
            onChange={(e) => setHideLinkOnly(e.target.checked)}
            className="rounded border-gray-300 accent-[#0047FF]"
          />
          <span>Hide link-only citations</span>
        </label>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          id="member-filter"
          name="member-filter"
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-[#F9F8F6] px-3 py-1.5 text-xs font-mono text-[#1A1A1B] focus:border-[#0047FF] outline-none"
        >
          <option value="all">All members</option>
          {list.map((m) => (
            <option key={m.student_id} value={String(m.student_id)}>
              {m.student_name}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden text-xs font-mono font-bold bg-[#F9F8F6] p-0.5">
          {[
            ['all', 'All'],
            ['survived', 'Survived'],
            ['rewritten', 'Rewritten'],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setSurvival(v)}
              aria-pressed={survival === v}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                survival === v
                  ? 'bg-[#0047FF] text-white shadow-xs'
                  : 'text-gray-600 hover:text-[#1A1A1B]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-gray-500 py-6 text-center font-mono">
          {totalPastes === 0 ? 'No external pastes recorded.' : 'No pastes match the current filters.'}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((p, idx) => {
            const key = `${p.member.student_id}-${p.sequence ?? idx}`;
            const open = expanded === key;
            return (
              <div key={key} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <button
                  onClick={() => setExpanded(open ? null : key)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#F9F8F6] transition-colors cursor-pointer"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-xs font-bold text-[#1A1A1B] shrink-0">{p.member.student_name}</span>
                  <span className="flex-1 text-xs text-gray-500 font-mono truncate min-w-0">{p.text}</span>
                  {p.links.length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-[#0047FF] bg-[#0047FF]/5 px-2 py-0.5 rounded border border-[#0047FF]/15 shrink-0">
                      <Link2 className="w-3 h-3" /> {p.links.length}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border font-semibold shrink-0 ${
                      p.survived
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {p.survived ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-amber-600" /> retained
                      </>
                    ) : (
                      <>
                        <PenLine className="w-3 h-3 text-emerald-600" /> rewritten
                      </>
                    )}
                  </span>
                  {open ? (
                    <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </button>

                {open && (
                  <div className="p-4 pt-2 border-t border-gray-100 bg-[#F9F8F6] space-y-2">
                    <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words bg-white border border-gray-200 rounded-lg p-3 font-mono leading-relaxed">
                      {p.text}
                    </pre>
                    <div className="flex items-center gap-4 text-[11px] font-mono text-gray-500 flex-wrap">
                      <span>{p.len} characters pasted</span>
                      <span>{p.deleted} characters deleted subsequently</span>
                      <span>{new Date(p.ts * 1000).toLocaleString()}</span>
                    </div>
                    {p.links.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {p.links.map((l) => (
                          <a
                            key={l}
                            href={l}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs text-[#0047FF] hover:underline font-mono truncate"
                          >
                            {l}
                          </a>
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
