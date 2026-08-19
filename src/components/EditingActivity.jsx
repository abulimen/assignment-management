import React, { useMemo } from 'react';
import { Edit3, CheckCircle2, AlertTriangle, Trash2, PlusCircle, Info } from 'lucide-react';

export default function EditingActivity({ events }) {
  const metrics = useMemo(() => {
    if (!events || !events.length) {
      return {
        inlineCorrections: 0,
        structuralRevisions: 0,
        approxAddedWords: 0,
        approxDeletedWords: 0,
        isHealthy: true,
        summary: 'Standard iterative revision and typing flow recorded.',
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
    const isLowEdit = totalEdits < 3 && approxAddedWords > 120;

    let summary = 'Document underwent standard iterative revision and continuous in-line corrections throughout the writing session.';
    if (isLowEdit) {
      summary = 'Document was composed linearly in a single pass with almost zero backspacing, deletions, or structural rewrites.';
    } else if (structuralRevisions >= 3) {
      summary = `Extensive restructuring recorded with ${structuralRevisions} revision cycles and ${inlineCorrections} in-line typo fixes.`;
    }

    return {
      inlineCorrections,
      structuralRevisions,
      approxAddedWords,
      approxDeletedWords,
      isHealthy: !isLowEdit,
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
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-800">
              Editing & Revisions
            </h3>
            <span className="text-[10px] text-gray-500 font-sans">
              Typo Corrections & Content Refining
            </span>
          </div>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 shadow-2xs ${
          metrics.isHealthy
            ? 'text-emerald-800 bg-emerald-50 border-emerald-300'
            : 'text-amber-800 bg-amber-50 border-amber-300'
        }`}>
          {metrics.isHealthy ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertTriangle className="w-3 h-3 text-amber-600" />}
          <span>{metrics.isHealthy ? 'Iterative Editing' : 'Linear / Single Pass'}</span>
        </span>
      </div>

      {/* Metrics Grid with Color-Coded Level Badges */}
      <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
        <div className={`p-3.5 rounded-xl border ${
          metrics.inlineCorrections > 0
            ? 'bg-blue-50/50 border-blue-200/70 text-blue-950'
            : 'bg-amber-50/50 border-amber-200 text-amber-950'
        }`}>
          <div className="text-[10px] text-gray-600 font-sans uppercase font-bold tracking-wider">In-line Corrections</div>
          <div className="font-bold text-lg text-[#0047FF] mt-0.5">
            {metrics.inlineCorrections.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 font-sans mt-0.5">Typo fixes & backspaces</div>
        </div>

        <div className={`p-3.5 rounded-xl border ${
          metrics.structuralRevisions > 0
            ? 'bg-purple-50/50 border-purple-200/70 text-purple-950'
            : 'bg-gray-50 border-gray-200 text-gray-700'
        }`}>
          <div className="text-[10px] text-gray-600 font-sans uppercase font-bold tracking-wider">Structural Revisions</div>
          <div className={`font-bold text-lg mt-0.5 ${metrics.structuralRevisions > 0 ? 'text-purple-700' : 'text-gray-600'}`}>
            {metrics.structuralRevisions}
          </div>
          <div className="text-[10px] text-gray-500 font-sans mt-0.5">Paragraph & block rewrites</div>
        </div>
      </div>

      {/* Added vs Deleted Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
            Added ~{metrics.approxAddedWords.toLocaleString()} words ({addedPct}%)
          </span>
          <span className="text-rose-700 font-semibold flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            Deleted ~{metrics.approxDeletedWords.toLocaleString()} words ({deletedPct}%)
          </span>
        </div>

        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${addedPct}%` }}
            className="h-full bg-emerald-500 transition-all duration-300"
            title={`Added words: ${addedPct}%`}
          />
          <div
            style={{ width: `${deletedPct}%` }}
            className="h-full bg-rose-400 transition-all duration-300"
            title={`Deleted words: ${deletedPct}%`}
          />
        </div>
      </div>

      <div className="text-[11px] text-gray-600 font-sans leading-relaxed pt-1 border-t border-gray-100 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-[#0047FF] shrink-0 mt-0.5" />
        <span>{metrics.summary}</span>
      </div>
    </div>
  );
}
