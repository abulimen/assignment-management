import { ShieldCheck, AlertTriangle, CheckCircle2, Clipboard, Eye } from 'lucide-react';

/**
 * VerdictPanel — lecturer-facing originality card.
 *
 * Design principle: A lecturer should be able to read this in 5 seconds
 * and know exactly what action (if any) to take. No jargon, no factor tables.
 *
 * Layout:
 * 1. Verdict badge + score ring (what's the bottom line?)
 * 2. Paste summary (the single most actionable fact)
 * 3. Plain-language flags (what to look at)
 * 4. Positive indicators (what looks fine)
 */

const VERDICT_CONFIG = {
  'Likely Original': {
    pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    ring: '#10B981',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
    headline: 'Looks good',
    sub: 'Writing patterns are consistent with original work.',
  },
  'Mostly Consistent': {
    pill: 'bg-amber-50 text-amber-800 border-amber-200',
    ring: '#F59E0B',
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    headline: 'Minor concerns',
    sub: 'Mostly looks original, but a few things are worth a second look.',
  },
  'Needs Review': {
    pill: 'bg-orange-50 text-orange-800 border-orange-200',
    ring: '#F97316',
    icon: AlertTriangle,
    iconColor: 'text-orange-600',
    headline: 'Needs your attention',
    sub: 'Some patterns are unusual — review the highlighted areas before grading.',
  },
  'Mixed Evidence': {
    pill: 'bg-orange-50 text-orange-800 border-orange-200',
    ring: '#F97316',
    icon: AlertTriangle,
    iconColor: 'text-orange-600',
    headline: 'Conflicting signals',
    sub: 'The evidence is mixed. Look at the document carefully before grading.',
  },
  'Significant Concerns': {
    pill: 'bg-red-50 text-red-800 border-red-200',
    ring: '#EF4444',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    headline: 'Significant issues found',
    sub: 'Multiple patterns suggest this work may not be original. Do not grade until reviewed.',
  },
};

function ScoreRing({ score, color }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - (score ?? 50) / 100);
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0" aria-hidden="true">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#E5E7EB" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={circ}
        strokeDashoffset={fill}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="monospace" fill="#1A1A1B">
        {score ?? '?'}
      </text>
    </svg>
  );
}

const cardCls = 'bg-white rounded-2xl border border-gray-200 p-5 shadow-xs';

export default function VerdictPanel({ verdict, loading }) {
  if (loading) {
    return (
      <div className={cardCls}>
        <PanelHeader />
        <div className="flex flex-col items-center justify-center py-8 space-y-3">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#0047FF] border-t-transparent" />
          <span className="text-xs text-gray-500">Analyzing submission…</span>
        </div>
      </div>
    );
  }

  if (!verdict || verdict.confidence === 'none' || verdict.error) {
    return (
      <div className={cardCls}>
        <PanelHeader />
        <p className="text-xs text-gray-500 text-center py-6">
          {verdict?.error || 'No analysis available for this submission.'}
        </p>
      </div>
    );
  }

  const cfg = VERDICT_CONFIG[verdict.verdict] || VERDICT_CONFIG['Mixed Evidence'];
  const Icon = cfg.icon;

  // ── Paste facts ──────────────────────────────────────────────────
  const pasteF = verdict.factors?.paste_integrity;
  // extract paste % from detail string like "38% of final text is unmodified paste"
  const pastePctMatch = pasteF?.detail?.match(/(\d+)%\s+of\s+final\s+text/);
  const pastePct = pastePctMatch ? parseInt(pastePctMatch[1]) : null;

  // ── Concerns & positives from decision record ─────────────────────
  const concerns = verdict.decision_record?.concerns || [];
  const positives = verdict.decision_record?.evidence_for_originality || [];

  // ── Risk flags (critical-first) ───────────────────────────────────
  const flags = (verdict.risk_flags || []).slice().sort((a, b) => {
    const rank = { critical: 0, warning: 1 };
    return (rank[a.level] ?? 2) - (rank[b.level] ?? 2);
  });

  return (
    <div className={cardCls + ' space-y-4'}>
      <PanelHeader />

      {/* ── Verdict hero ── */}
      <div className={`flex items-center gap-3 p-3.5 rounded-xl border ${cfg.pill}`}>
        <ScoreRing score={verdict.overall_score} color={cfg.ring} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-lg border ${cfg.pill}`}>
              <Icon className={`w-3.5 h-3.5 ${cfg.iconColor}`} />
              {verdict.verdict}
            </span>
          </div>
          <p className="text-xs text-gray-700 mt-1 leading-snug">{cfg.sub}</p>
        </div>
      </div>

      {/* ── Paste summary — the single most actionable number ── */}
      {pastePct !== null && (
        <div className={`flex items-start gap-3 p-3.5 rounded-xl border ${
          pastePct >= 50 ? 'bg-red-50 border-red-200' :
          pastePct >= 25 ? 'bg-amber-50 border-amber-200' :
          'bg-gray-50 border-gray-200'
        }`}>
          <Clipboard className={`w-4 h-4 mt-0.5 shrink-0 ${
            pastePct >= 50 ? 'text-red-600' :
            pastePct >= 25 ? 'text-amber-600' :
            'text-gray-500'
          }`} />
          <div>
            <div className={`text-sm font-black font-mono ${
              pastePct >= 50 ? 'text-red-800' :
              pastePct >= 25 ? 'text-amber-800' :
              'text-gray-800'
            }`}>{pastePct}% pasted from external source</div>
            <div className="text-xs text-gray-600 mt-0.5">
              {pastePct === 0
                ? 'No external text was pasted into the document.'
                : pastePct < 10
                ? 'A very small amount was pasted — likely a quote or reference.'
                : pastePct < 25
                ? 'Some pasted content — verify it\'s properly cited.'
                : pastePct < 50
                ? 'A substantial portion was pasted. Review the red-highlighted text in the document.'
                : 'Most of the document was pasted. Review the red-highlighted text before grading.'}
            </div>
          </div>
        </div>
      )}

      {/* ── Risk flags / concerns ── */}
      {(flags.length > 0 || concerns.length > 0) && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            What to check
          </div>
          {/* Use risk_flags for critical/warning, fall back to concerns */}
          {flags.length > 0 ? (
            <ul className="space-y-1.5">
              {flags.map((flag, i) => (
                <li key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
                  flag.level === 'critical' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                    flag.level === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  {flag.message}
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-1.5">
              {concerns.slice(0, 4).map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-amber-50 text-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Positive indicators ── */}
      {positives.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-gray-100">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Looks normal
          </div>
          <ul className="space-y-1">
            {positives.slice(0, 4).map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence note (small, unobtrusive) */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10px] font-mono text-gray-400">
        <span className="flex items-center gap-1">
          <Eye className="w-3 h-3" />
          Analysis confidence: <strong className="capitalize text-gray-500">&nbsp;{verdict.confidence}</strong>
        </span>
        {verdict.needs_review && (
          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded font-bold text-[9px] uppercase tracking-wide">
            Flag for review
          </span>
        )}
      </div>
    </div>
  );
}

function PanelHeader() {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
      <ShieldCheck className="w-4 h-4 text-[#0047FF]" />
      <h2 className="text-sm font-bold text-[#1A1A1B]">Originality Check</h2>
    </div>
  );
}
