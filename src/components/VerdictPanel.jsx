import { Shield, AlertTriangle, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import DecisionRecord from './DecisionRecord';

function ScoreGauge({ score }) {
  const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-yellow-500' : score >= 40 ? 'text-orange-500' : 'text-red-500';
  const bg = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500';
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="10"
          className={color} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
        <text x="70" y="70" textAnchor="middle" dominantBaseline="central"
          className="fill-current text-2xl font-bold" style={{ fill: 'currentColor' }}>
          <tspan className={color}>{score}</tspan>
        </text>
      </svg>
      <span className="text-xs text-gray-400 mt-1">Originality Score</span>
    </div>
  );
}

function FactorCard({ factor }) {
  const color = factor.score >= 80 ? 'text-green-600 bg-green-50' : factor.score >= 60 ? 'text-yellow-600 bg-yellow-50' : factor.score >= 40 ? 'text-orange-600 bg-orange-50' : 'text-red-600 bg-red-50';
  const barColor = factor.score >= 80 ? 'bg-green-500' : factor.score >= 60 ? 'bg-yellow-500' : factor.score >= 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className={`bg-white rounded-lg border p-3 ${factor.score < 40 ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{factor.label}</span>
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${color}`}>{factor.score}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${factor.score}%`, transition: 'width 0.6s ease' }} />
      </div>
      <p className="text-xs text-gray-600 leading-snug">{factor.narrative || factor.detail}</p>
      {factor.narrative && factor.detail && (
        <p className="text-[11px] text-gray-400 mt-1.5">{factor.detail}</p>
      )}
      {factor.score < 40 && factor.flip && (
        <p className="text-[11px] text-blue-600 mt-1.5 leading-snug">Would change if: {factor.flip}</p>
      )}
    </div>
  );
}

export default function VerdictPanel({ verdict, loading }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold">AI Originality Analysis</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-500">Analyzing submission...</span>
        </div>
      </div>
    );
  }

  if (!verdict || verdict.confidence === 'none') {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold">AI Originality Analysis</h2>
        </div>
        <p className="text-gray-400 text-center py-8">
          {verdict?.error || 'Analyzer unavailable. Start the analyzer service: cd analyzer-node && npm start (port 8002)'}
        </p>
      </div>
    );
  }

  // A red factor beside a green aggregate reads as "Needs Review" — amber,
  // never a clean green, so the conflict can't be missed.
  const needsReview = verdict.needs_review === true;

  const verdictIcon = needsReview ? <AlertTriangle className="w-5 h-5 text-orange-500" />
    : verdict.overall_score >= 80 ? <CheckCircle className="w-5 h-5 text-green-500" />
    : verdict.overall_score >= 60 ? <AlertCircle className="w-5 h-5 text-yellow-500" />
    : verdict.overall_score >= 40 ? <AlertTriangle className="w-5 h-5 text-orange-500" />
    : <XCircle className="w-5 h-5 text-red-500" />;

  const verdictColor = needsReview ? 'text-orange-700 bg-orange-50 border-orange-200'
    : verdict.overall_score >= 80 ? 'text-green-700 bg-green-50 border-green-200'
    : verdict.overall_score >= 60 ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
    : verdict.overall_score >= 40 ? 'text-orange-700 bg-orange-50 border-orange-200'
    : 'text-red-700 bg-red-50 border-red-200';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-semibold">AI Originality Analysis</h2>
      </div>

      {/* Verdict banner */}
      <div className={`rounded-xl border p-4 mb-4 ${verdictColor}`}>
        <div className="flex items-center gap-3">
          {verdictIcon}
          <div>
            <p className="font-semibold">{verdict.verdict}</p>
            <p className="text-xs opacity-75">Confidence: {verdict.confidence}</p>
          </div>
          <div className="ml-auto">
            <ScoreGauge score={verdict.overall_score} />
          </div>
        </div>
      </div>

      {/* Red-factor conflict banner: a green aggregate must not bury a red factor */}
      {needsReview && verdict.flagged_factors?.length > 0 && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 p-4 mb-6">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-orange-800">One or more factors raise a concern</p>
              <p className="text-sm text-orange-700 mt-1">
                The overall score is pulled up by strong signals, but the factor{verdict.flagged_factors.length > 1 ? 's' : ''} below
                look{verdict.flagged_factors.length === 1 ? 's' : ''} unusual. Review the playback before relying on the green headline.
              </p>
            </div>
          </div>
          <div className="space-y-1.5 mt-2">
            {verdict.flagged_factors.map((f) => (
              <div key={f.key} className="flex items-center gap-2 bg-white/70 rounded-lg border border-orange-200 px-3 py-2">
                <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0">{f.score}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{f.label}</p>
                  <p className="text-xs text-gray-500 truncate">{f.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Decision record: why this verdict and what would change it */}
      <DecisionRecord record={verdict.decision_record} />

      {/* Risk flags */}
      {verdict.risk_flags?.length > 0 && (
        <div className="mb-6 space-y-2">
          {verdict.risk_flags.map((flag, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              flag.level === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              {flag.level === 'critical' ? <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              <span>{flag.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Factor breakdown */}
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Factor Breakdown</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(verdict.factors || {}).map(([key, factor]) => (
          <FactorCard key={key} factor={factor} />
        ))}
      </div>
    </div>
  );
}