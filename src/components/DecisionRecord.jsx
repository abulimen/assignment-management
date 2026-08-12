import { FileSearch, CheckCircle2, AlertTriangle, RefreshCcw } from 'lucide-react';

// Renders the analyzer's decision record: why the verdict landed where it did,
// the evidence for and against originality, and exactly what would change the
// call. Shown un-collapsed on purpose — the point is that a green headline can
// never hide a red factor, and a disputed verdict carries its own rebuttal.
export default function DecisionRecord({ record }) {
  if (!record) return null;
  const { summary, verdict_rationale, evidence_for_originality, concerns, flip_conditions } = record;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <FileSearch className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-semibold">Decision Record</h3>
      </div>

      <p className="text-sm text-gray-800 font-medium mb-1">{summary}</p>
      {verdict_rationale && <p className="text-xs text-gray-500 mb-4">{verdict_rationale}</p>}

      <div className="space-y-4">
        {evidence_for_originality?.length > 0 && (
          <Section
            icon={<CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
            title="Evidence supporting originality"
            tone="text-green-700"
            items={evidence_for_originality}
          />
        )}

        {concerns?.length > 0 && (
          <Section
            icon={<AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />}
            title="Concerns"
            tone="text-orange-700"
            items={concerns}
          />
        )}

        {flip_conditions?.length > 0 && (
          <Section
            icon={<RefreshCcw className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />}
            title="What would change this verdict"
            tone="text-blue-700"
            items={flip_conditions}
          />
        )}

        {!concerns?.length && !flip_conditions?.length && (
          <p className="text-sm text-gray-400">No factors raised a concern for this submission.</p>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, tone, items }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <h4 className={`text-sm font-semibold ${tone}`}>{title}</h4>
      </div>
      <ul className="space-y-1.5 ml-5.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-700 leading-snug list-disc">{item}</li>
        ))}
      </ul>
    </div>
  );
}
