import React, { useMemo } from 'react';
import { Edit3, CheckCircle2, RotateCcw, Trash2, PlusCircle } from 'lucide-react';

export default function EditingActivity({ events }) {
  const metrics = useMemo(() => {
    if (!events || !events.length) {
      return {
        inlineCorrections: 0,
        structuralRevisions: 0,
        approxAddedWords: 0,
        approxDeletedWords: 0,
        summary: 'No editing actions recorded.',
      };
    }

    let inlineCorrections = 0;
    let structuralRevisions = 0;
    let addedChars = 0;
    let deletedChars = 0;
    let accumulatedDeletes = 0;

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];

      if (ev.type === 'step' || ev.type === 'keystroke') {
        addedChars += 1;
      } else if (ev.type === 'paste') {
        const text = ev.data?.pasted_text || ev.data?.text || '';
        const len = text.length || ev.data?.pasted_text_length || ev.data?.length || 0;
        addedChars += len;
      } else if (ev.type === 'delete') {
        const delLen = Number(ev.data?.length) || 1;
        deletedChars += delLen;

        if (delLen <= 5) {
          inlineCorrections += 1;
        } else {
          accumulatedDeletes += delLen;
          if (accumulatedDeletes >= 30) {
            structuralRevisions += 1;
            accumulatedDeletes = 0;
          }
        }
      }
    }

    const approxAddedWords = Math.round(addedChars / 5.5);
    const approxDeletedWords = Math.round(deletedChars / 5.5);

    const totalEdits = inlineCorrections + structuralRevisions;
    let summary = 'Document underwent standard iterative revision and in-line corrections.';
    if (totalEdits === 0) {
      summary = 'Document was drafted with minimal backspacing or deletions.';
    } else if (structuralRevisions >= 3) {
      summary = `Extensive restructuring recorded with ${structuralRevisions} substantial revision cycles and ${inlineCorrections} in-line corrections.`;
    }

    return {
      inlineCorrections,
      structuralRevisions,
      approxAddedWords,
      approxDeletedWords,
      summary,
    };
  }, [events]);

  const totalWordsAction = Math.max(metrics.approxAddedWords + metrics.approxDeletedWords, 1);
  const addedPct = Math.round((metrics.approxAddedWords / totalWordsAction) * 100);
  const deletedPct = Math.round((metrics.approxDeletedWords / totalWordsAction) * 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-[#0047FF]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
            Editing & Revisions
          </h3>
        </div>
        <span className="text-[10px] font-mono text-gray-400">Process Breakdown</span>
      </div>

      {/* Metrics Grid with Color-Coded Level Badges */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-200/70">
          <div className="text-[10px] text-blue-700 font-sans uppercase font-semibold">In-line Corrections</div>
          <div className="font-bold text-base text-blue-950 mt-0.5">
            {metrics.inlineCorrections.toLocaleString()}
          </div>
          <div className="text-[9px] text-blue-600/80 font-sans mt-0.5">Typo fixes / backspaces</div>
        </div>

        <div className={`p-2.5 rounded-xl border ${
          metrics.structuralRevisions > 0
            ? 'bg-purple-50/50 border-purple-200/70'
            : 'bg-gray-50 border-gray-200/80'
        }`}>
          <div className={`text-[10px] font-sans uppercase font-semibold ${
            metrics.structuralRevisions > 0 ? 'text-purple-700' : 'text-gray-500'
          }`}>
            Structural Revisions
          </div>
          <div className={`font-bold text-base mt-0.5 ${
            metrics.structuralRevisions > 0 ? 'text-purple-950' : 'text-gray-700'
          }`}>
            {metrics.structuralRevisions}
          </div>
          <div className={`text-[9px] font-sans mt-0.5 ${
            metrics.structuralRevisions > 0 ? 'text-purple-600/80' : 'text-gray-400'
          }`}>
            Paragraph / block rewrites
          </div>
        </div>
      </div>

      {/* Added vs Deleted Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <PlusCircle className="w-3 h-3 text-emerald-600" />
            Added ~{metrics.approxAddedWords.toLocaleString()}w
          </span>
          <span className="text-rose-700 font-semibold flex items-center gap-1">
            <Trash2 className="w-3 h-3 text-rose-600" />
            Deleted ~{metrics.approxDeletedWords.toLocaleString()}w
          </span>
        </div>

        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${addedPct}%` }} />
          <div className="bg-rose-400 h-full transition-all" style={{ width: `${deletedPct}%` }} />
        </div>
      </div>

      <p className="text-[11px] text-gray-600 font-sans leading-snug">
        {metrics.summary}
      </p>
    </div>
  );
}
