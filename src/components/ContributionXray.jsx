import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { Users, Clock, Keyboard, FileText, ChevronDown, ChevronUp, ShieldCheck, ShieldAlert, XCircle, AlertTriangle } from 'lucide-react';

const AUTHOR_COLORS = [
  'rgba(59, 130, 246, 0.35)',  // blue
  'rgba(34, 197, 94, 0.35)',   // green
  'rgba(168, 85, 247, 0.35)',  // purple
  'rgba(249, 115, 22, 0.35)',  // orange
  'rgba(236, 72, 153, 0.35)',  // pink
  'rgba(14, 165, 233, 0.35)',  // sky
  'rgba(234, 179, 8, 0.35)',   // yellow
  'rgba(239, 68, 68, 0.35)',   // red
];

const scoreBadge = s => s >= 80 ? 'bg-green-100 text-green-700'
  : s >= 60 ? 'bg-yellow-100 text-yellow-700'
  : s >= 40 ? 'bg-orange-100 text-orange-700'
  : 'bg-red-100 text-red-700';
const scoreLabel = s => s >= 80 ? 'Original' : s >= 60 ? 'Likely original' : s >= 40 ? 'Needs review' : 'High risk';

function FactorRow({ factor }) {
  const bar = factor.score >= 80 ? 'bg-green-500' : factor.score >= 60 ? 'bg-yellow-500' : factor.score >= 40 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{factor.label || factor.name || 'Factor'}</span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreBadge(factor.score)}`}>{factor.score}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
        <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${factor.score}%` }} />
      </div>
      <p className="text-xs text-gray-500">{factor.detail}</p>
    </div>
  );
}

export default function ContributionXray({ sections }) {
  const [verdicts, setVerdicts] = useState({});
  const [expanded, setExpanded] = useState(null);

  // Fetch each member's own originality verdict
  useEffect(() => {
    if (!sections?.length) return;
    let cancelled = false;
    Promise.all(sections.map(s =>
      api.get(`submissions/${s.submission_id}/verdict`)
        .then(v => [String(s.student_id), v])
        .catch(() => [String(s.student_id), null])
    )).then(entries => {
      if (!cancelled) setVerdicts(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, [sections]);

  const contributors = useMemo(() => {
    if (!sections?.length) return [];
    return sections.map((s, i) => ({
      id: String(s.student_id),
      name: s.student_name || 'Unknown',
      title: s.title || (typeof s.surviving_chars === 'number' ? 'Shared document' : 'Untitled'),
      wordCount: s.word_count || 0,
      keystrokes: s.keystroke_count || 0,
      timeMs: s.total_time_ms || 0,
      pasteRatio: s.paste_ratio,
      // Realtime groups: contribution = surviving text in the sealed doc.
      // Legacy merged groups: fall back to per-section word counts.
      survivingChars: typeof s.surviving_chars === 'number' ? s.surviving_chars : null,
      color: AUTHOR_COLORS[i % AUTHOR_COLORS.length],
    }));
  }, [sections]);

  // Share metric: surviving chars (realtime) or word count (legacy).
  const shareOf = (c) => c.survivingChars ?? c.wordCount;
  const totalShare = contributors.reduce((sum, c) => sum + shareOf(c), 0);

  // Group summary: share-weighted average + flagged members
  const { avgScore, flagged } = useMemo(() => {
    const scored = contributors
      .map(c => ({ c, v: verdicts[c.id] }))
      .filter(x => x.v && typeof x.v.overall_score === 'number');
    const totalW = scored.reduce((s, x) => s + shareOf(x.c), 0);
    const avg = totalW > 0
      ? Math.round(scored.reduce((s, x) => s + shareOf(x.c) * x.v.overall_score, 0) / totalW)
      : null;
    return { avgScore: avg, flagged: scored.filter(x => x.v.overall_score < 50).map(x => x.c.name) };
  }, [contributors, verdicts]);

  if (contributors.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-semibold">Contribution X-Ray</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">Click a member to inspect their originality analysis.</p>

      {/* Group summary */}
      {avgScore !== null && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full ${scoreBadge(avgScore)}`}>
            <ShieldCheck className="w-4 h-4" /> Group Originality: {avgScore}
          </span>
          {flagged.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              <ShieldAlert className="w-4 h-4" /> Flagged: {flagged.join(', ')}
            </span>
          )}
          {flagged.length === 0 && (
            <span className="text-xs text-gray-400">No member below the 50-point threshold.</span>
          )}
        </div>
      )}

      {/* Stacked bar — share of the final text (surviving chars or words) */}
      {totalShare > 0 && (
        <div className="flex h-8 rounded-lg overflow-hidden mb-4">
          {contributors.map(c => {
            const pct = (shareOf(c) / totalShare) * 100;
            if (pct === 0) return null;
            const unit = c.survivingChars != null ? `${c.survivingChars} chars kept` : `${c.wordCount} words`;
            return (
              <div key={c.id} style={{ width: `${pct}%`, backgroundColor: c.color }}
                className="flex items-center justify-center text-xs font-medium text-gray-700 truncate"
                title={`${c.name}: ${unit} (${pct.toFixed(1)}%)`}>
                {pct > 10 ? c.name.split(' ')[0] : ''}
              </div>
            );
          })}
        </div>
      )}

      {/* Per-student breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {contributors.map(c => {
          const v = verdicts[c.id];
          const pct = totalShare > 0 ? (shareOf(c) / totalShare) * 100 : 0;
          const minutes = Math.round(c.timeMs / 60000);
          const isOpen = expanded === c.id;
          const pastePct = typeof c.pasteRatio === 'number'
            ? `${(c.pasteRatio * 100).toFixed(1)}%` : '—';
          return (
            <div key={c.id}>
              <button onClick={() => setExpanded(isOpen ? null : c.id)}
                className={`w-full text-left border border-gray-200 rounded-lg p-3 transition-colors ${isOpen ? 'ring-2 ring-primary-200' : 'hover:bg-gray-50'}`}
                style={{ borderLeft: `4px solid ${c.color.replace('0.35', '1')}` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-2">{c.title}</p>
                {c.survivingChars != null && (
                  <p className="text-xs text-gray-600 mb-2">
                    <strong>{pct.toFixed(1)}%</strong> of the final text survived ({c.survivingChars} chars)
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div className="flex items-center gap-1 text-gray-500"><FileText className="w-3 h-3" /> {c.wordCount}w</div>
                  <div className="flex items-center gap-1 text-gray-500"><Keyboard className="w-3 h-3" /> {c.keystrokes}k</div>
                  <div className="flex items-center gap-1 text-gray-500"><Clock className="w-3 h-3" /> {minutes}m</div>
                </div>
                {v && typeof v.overall_score === 'number' ? (
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreBadge(v.overall_score)}`}>
                      {v.overall_score} · {scoreLabel(v.overall_score)}
                    </span>
                    <span className="text-xs text-gray-500">Paste: {pastePct}</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">Originality: analyser unavailable</span>
                )}
              </button>

              {isOpen && v && typeof v.overall_score === 'number' && (
                <div className="mt-2 space-y-2">
                  {v.risk_flags?.length > 0 && (
                    <div className="space-y-1.5">
                      {v.risk_flags.map((flag, i) => (
                        <div key={i} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${flag.level === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                          {flag.level === 'critical' ? <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
                          <span>{flag.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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