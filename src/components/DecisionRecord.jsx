import { CheckCircle2, AlertTriangle, RefreshCcw } from 'lucide-react';

// The detailed "why this verdict" block, rendered inside the VerdictPanel's
// expander. No outer card — it embeds in the verdict card so the review page
// stays a single, scannable surface instead of stacked panels.

function FactorCard({ factor }) {
  const score = factor.score;
  const scoreColor = score >= 80 ? 'text-green-700' : score >= 60 ? 'text-yellow-700' : score >= 40 ? 'text-orange-700' : 'text-red-600';
  const barColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div className={`rounded-lg border p-3 ${score < 40 ? 'border-red-200 bg-red-50/40' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-700">{factor.label}</span>
        <span className={`text-sm font-bold ${scoreColor}`}>{score}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1 mb-2">
        <div className={`h-1 rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <p className="text-xs text-gray-600 leading-snug">{factor.narrative || factor.detail}</p>
      {score < 40 && factor.flip && (
        <p className="text-xs text-blue-700 mt-1.5 leading-snug">
          <RefreshCcw className="w-3 h-3 inline mr-1" />{factor.flip}
        </p>
      )}
    </div>
  );
}

export default function DecisionRecord({ record, factors }) {
  if (!record) return null;
  const { evidence_for_originality, concerns, flip_conditions } = record;
  const hasConcerns = concerns?.length > 0;

  return (
    <div className="space-y-5">
      {hasConcerns && (
        <DetailList
          icon={<AlertTriangle className="w-4 h-4 text-orange-600" />}
          title="What raised a concern"
          items={concerns}
          tone="text-orange-700"
        />
      )}

      {evidence_for_originality?.length > 0 && (
        <DetailList
          icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
          title="What looks original"
          items={evidence_for_originality}
          tone="text-green-700"
        />
      )}

      {factors && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">How each signal scored</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.entries(factors).map(([key, factor]) => (
              <FactorCard key={key} factor={factor} />
            ))}
          </div>
        </div>
      )}

      {!hasConcerns && flip_conditions?.length > 0 && (
        <p className="text-xs text-gray-600">No signals raised a concern for this submission.</p>
      )}
    </div>
  );
}

function DetailList({ icon, title, items, tone }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <h3 className={`text-sm font-semibold ${tone}`}>{title}</h3>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-700 leading-snug pl-5.5 ml-0.5 list-disc">{item}</li>
        ))}
      </ul>
    </div>
  );
}
