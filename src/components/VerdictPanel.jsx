import { useState } from 'react';
import { Shield, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import DecisionRecord from './DecisionRecord';

// At-a-glance originality verdict. Designed for a lecturer scanning hundreds
// of submissions: one clean card with the score, the call, and a plain-language
// line — everything else tucks behind "Why this verdict". No jargon by default.

const VERDICT_TONE = {
  'Likely Original': { pill: 'bg-green-100 text-green-700', score: 'text-green-600' },
  'Mostly Consistent': { pill: 'bg-amber-100 text-amber-700', score: 'text-amber-600' },
  'Needs Review': { pill: 'bg-orange-100 text-orange-700', score: 'text-orange-600' },
  'Mixed Evidence': { pill: 'bg-orange-100 text-orange-700', score: 'text-orange-600' },
  'Significant Concerns': { pill: 'bg-red-100 text-red-700', score: 'text-red-600' },
};

const cardCls = 'bg-surface rounded-xl border border-line p-6 mb-6';

export default function VerdictPanel({ verdict, loading }) {
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className={cardCls}>
        <Header />
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-500">Analyzing submission…</span>
        </div>
      </div>
    );
  }

  if (!verdict || verdict.confidence === 'none') {
    return (
      <div className={cardCls}>
        <Header />
        <p className="text-gray-600 text-center py-6">
          {verdict?.error || 'No analysis available yet.'}
        </p>
      </div>
    );
  }

  const tone = VERDICT_TONE[verdict.verdict] || { pill: 'bg-gray-100 text-gray-600', score: 'text-gray-500' };
  const needsReview = verdict.needs_review === true;
  const summary = verdict.decision_record?.summary;

  return (
    <div className={cardCls}>
      <Header />

      {/* At-a-glance verdict */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className={`text-4xl font-bold tabular-nums ${tone.score}`}>{verdict.overall_score}</div>
        <div>
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-full ${tone.pill}`}>
            {needsReview && <AlertTriangle className="w-3.5 h-3.5" />}
            {verdict.verdict}
          </span>
          <p className="text-xs text-gray-600 mt-1 capitalize">Confidence: {verdict.confidence}</p>
        </div>
      </div>

      {/* Plain-language one-liner */}
      {summary && <p className="text-sm text-gray-700 leading-relaxed mt-4">{summary}</p>}

      {/* Progressive disclosure */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="verdict-details"
        className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 mt-4 min-h-11 px-3 -ml-3 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
      >
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {open ? 'Hide details' : 'Why this verdict'}
      </button>

      {open && (
        <div id="verdict-details" className="mt-4 pt-4 border-t border-gray-100">
          <DecisionRecord record={verdict.decision_record} factors={verdict.factors} />
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Shield className="w-5 h-5 text-primary-600" />
      <h2 className="text-lg font-semibold">Originality check</h2>
    </div>
  );
}
