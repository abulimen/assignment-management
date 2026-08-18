import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import {
  Users,
  Clock,
  Keyboard,
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

const AUTHOR_COLORS = [
  'rgba(0, 71, 255, 0.35)',   // cobalt blue (Draftly primary)
  'rgba(16, 185, 129, 0.35)', // emerald
  'rgba(139, 92, 246, 0.35)', // purple
  'rgba(245, 158, 11, 0.35)', // amber
  'rgba(236, 72, 153, 0.35)', // pink
  'rgba(6, 182, 212, 0.35)',  // cyan
  'rgba(239, 68, 68, 0.35)',  // red
];

const scoreBadge = (verdict) => {
  const v = verdict?.verdict;
  if (v === 'Likely Original') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (v === 'Mostly Consistent') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (v === 'Needs Review' || v === 'Mixed Evidence') return 'bg-orange-50 text-orange-800 border-orange-200';
  if (v === 'Significant Concerns') return 'bg-red-50 text-red-800 border-red-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const factorBadge = (score) =>
  score >= 80
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : score >= 60
    ? 'bg-amber-50 text-amber-800 border-amber-200'
    : score >= 40
    ? 'bg-orange-50 text-orange-800 border-orange-200'
    : 'bg-red-50 text-red-800 border-red-200';

function FactorRow({ factor }) {
  const rating =
    factor.score >= 80 ? 'Normal pattern' : factor.score >= 60 ? 'Typical' : factor.score >= 40 ? 'Notable' : 'Needs attention';

  return (
    <div className="border border-gray-200 bg-white rounded-xl p-3 shadow-2xs space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#1A1A1B]">{factor.label || factor.name || 'Factor'}</span>
        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${factorBadge(factor.score)}`}>
          {rating}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 font-sans leading-relaxed">{factor.detail}</p>
    </div>
  );
}

export default function ContributionXray({ sections }) {
  const [verdicts, setVerdicts] = useState({});
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!sections?.length) return;
    let cancelled = false;
    Promise.all(
      sections.map((s) =>
        api.get(`submissions/${s.submission_id}/verdict`)
          .then((v) => [String(s.student_id), v])
          .catch(() => [String(s.student_id), null]),
      ),
    ).then((entries) => {
      if (!cancelled) setVerdicts(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, [sections]);

  const contributors = useMemo(() => {
    if (!sections?.length) return [];
    return sections.map((s, i) => ({
      id: String(s.student_id),
      name: s.student_name || 'Unknown',
      matric: s.student_matric || null,
      title: s.title || (typeof s.surviving_chars === 'number' ? 'Shared document' : 'Untitled'),
      wordCount: s.word_count || 0,
      keystrokes: s.keystroke_count || 0,
      timeMs: s.total_time_ms || 0,
      pasteRatio: s.paste_ratio,
      survivingChars: typeof s.surviving_chars === 'number' ? s.surviving_chars : null,
      color: AUTHOR_COLORS[i % AUTHOR_COLORS.length],
    }));
  }, [sections]);

  const shareOf = (c) => c.survivingChars ?? c.wordCount;
  const totalShare = contributors.reduce((sum, c) => sum + shareOf(c), 0);

  const flagged = useMemo(() => {
    return contributors
      .filter((c) => {
        const v = verdicts[c.id];
        return v && v.needs_review;
      })
      .map((c) => c.name);
  }, [contributors, verdicts]);

  if (contributors.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-7 shadow-xs mb-6 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#0047FF]" />
          <div>
            <h2 className="text-base font-bold text-[#1A1A1B]">Member Contributions</h2>
            <p className="text-xs text-gray-500 font-sans">
              Proportional surviving text and individual drafting activity.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
          Sealed Snapshot
        </span>
      </div>

      {/* Group summary alerts */}
      {flagged.length > 0 ? (
        <div className="flex items-center gap-2 text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Members with notable telemetry signals: {flagged.join(', ')}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-emerald-800 font-sans bg-emerald-50/50 border border-emerald-200 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>All member telemetry patterns align with normal group drafting.</span>
        </div>
      )}

      {/* Stacked bar — surviving text breakdown */}
      {totalShare > 0 && (
        <div className="space-y-1.5">
          <div className="flex h-7 rounded-xl overflow-hidden border border-gray-200 p-0.5 bg-[#F9F8F6]">
            {contributors.map((c) => {
              const pct = (shareOf(c) / totalShare) * 100;
              if (pct === 0) return null;
              const unit =
                c.survivingChars != null ? `${c.survivingChars} chars kept` : `${c.wordCount} words`;
              return (
                <div
                  key={c.id}
                  style={{ width: `${pct}%`, backgroundColor: c.color }}
                  className="flex items-center justify-center text-[10px] font-mono font-bold text-[#1A1A1B] truncate rounded-sm first:rounded-l-lg last:rounded-r-lg"
                  title={`${c.name}: ${unit} (${pct.toFixed(1)}%)`}
                >
                  {pct > 12 ? c.name.split(' ')[0] : ''}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-student cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
        {contributors.map((c) => {
          const v = verdicts[c.id];
          const pct = totalShare > 0 ? (shareOf(c) / totalShare) * 100 : 0;
          const minutes = Math.round(c.timeMs / 60000);
          const isOpen = expanded === c.id;
          const pastePct =
            typeof c.pasteRatio === 'number' ? `${(c.pasteRatio * 100).toFixed(0)}%` : '—';

          return (
            <div key={c.id}>
              <button
                onClick={() => setExpanded(isOpen ? null : c.id)}
                aria-expanded={isOpen}
                aria-controls={`xray-detail-${c.id}`}
                className={`w-full text-left border rounded-2xl p-4 transition-all cursor-pointer ${
                  isOpen
                    ? 'border-[#0047FF] ring-2 ring-[#0047FF]/15 bg-white shadow-xs'
                    : 'border-gray-200 bg-[#F9F8F6] hover:bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-xs font-bold text-[#1A1A1B] flex-wrap">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: c.color.replace('0.35', '1') }}
                      aria-hidden="true"
                    />
                    <span>{c.name}</span>
                    {c.matric && (
                      <span className="text-[10px] font-mono text-gray-500">
                        ({c.matric})
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-[#0047FF] bg-[#0047FF]/5 px-2 py-0.5 rounded border border-[#0047FF]/15">
                      {pct.toFixed(1)}%
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </span>
                </div>

                {c.survivingChars != null && (
                  <p className="text-[11px] text-gray-500 font-mono mb-2">
                    {c.survivingChars.toLocaleString()} characters in final document
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-gray-600 bg-white p-2.5 rounded-xl border border-gray-200/80 mb-3">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-[#0047FF]" /> {c.wordCount}w
                  </div>
                  <div className="flex items-center gap-1">
                    <Keyboard className="w-3 h-3 text-[#0047FF]" /> {c.keystrokes}k
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#0047FF]" /> {minutes}m
                  </div>
                </div>

                {v ? (
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`font-sans font-bold text-[11px] px-2 py-0.5 rounded-md border ${scoreBadge(v)}`}
                    >
                      {v.verdict || 'Standard telemetry'}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500">Paste: {pastePct}</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-gray-400 font-mono">Telemetry pending</span>
                )}
              </button>

              {isOpen && v && (
                <div id={`xray-detail-${c.id}`} className="mt-2.5 space-y-2 p-3 bg-white rounded-2xl border border-gray-200">
                  {v.risk_flags?.length > 0 && (
                    <div className="space-y-1.5">
                      {v.risk_flags.map((flag, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 p-2.5 rounded-xl text-xs font-sans ${
                            flag.level === 'critical'
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {flag.level === 'critical' ? (
                            <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          )}
                          <span>{flag.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {Object.entries(v.factors || {}).map(([key, factor]) => (
                      <FactorRow key={key} factor={factor} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}