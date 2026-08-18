import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

function getFactorRating(score) {
  if (score >= 80) return { label: 'Normal pattern', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (score >= 60) return { label: 'Typical variation', pill: 'bg-amber-50 text-amber-800 border-amber-200' };
  if (score >= 40) return { label: 'Notable variation', pill: 'bg-orange-50 text-orange-800 border-orange-200' };
  return { label: 'Needs attention', pill: 'bg-red-50 text-red-800 border-red-200' };
}

function FactorCard({ factor }) {
  const score = factor.score;
  const rating = getFactorRating(score);

  return (
    <div
      className={`rounded-xl border p-3.5 space-y-2 ${
        score < 40 ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-[#F9F8F6]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[#1A1A1B]">{factor.label}</span>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${rating.pill}`}>
          {rating.label}
        </span>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed font-sans">{factor.narrative || factor.detail}</p>
    </div>
  );
}

export default function DecisionRecord({ record, factors }) {
  if (!record) return null;
  const { evidence_for_originality, concerns } = record;
  const hasConcerns = concerns?.length > 0;
  const hasPositive = evidence_for_originality?.length > 0;

  return (
    <div className="space-y-4">
      {hasConcerns && (
        <DetailList
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          title="Areas of Attention"
          items={concerns}
          tone="text-amber-900"
          boxCls="bg-amber-50/50 border border-amber-200/80"
        />
      )}

      {hasPositive && (
        <DetailList
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          title="Positive Indicators"
          items={evidence_for_originality}
          tone="text-emerald-900"
          boxCls="bg-emerald-50/50 border border-emerald-200/80"
        />
      )}

      {factors && Object.keys(factors).length > 0 && (
        <div className="pt-2">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-500 mb-2.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#0047FF]" />
            <span>Telemetry Factors</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.entries(factors).map(([key, factor]) => (
              <FactorCard key={key} factor={factor} />
            ))}
          </div>
        </div>
      )}

      {!hasConcerns && (
        <p className="text-xs text-gray-500 font-mono">
          All telemetry patterns align with expected drafting behavior.
        </p>
      )}
    </div>
  );
}

function DetailList({ icon, title, items, tone, boxCls }) {
  return (
    <div className={`p-3.5 rounded-xl ${boxCls}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className={`text-xs font-bold font-mono uppercase tracking-wider ${tone}`}>{title}</h3>
      </div>
      <ul className="space-y-1.5 pl-5 list-disc text-xs text-gray-700 font-sans leading-relaxed">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

