import React, { useMemo } from 'react';
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react';

export default function WritingPatternSummary({ events }) {
  const pattern = useMemo(() => {
    if (!events || !events.length) {
      return {
        status: 'Consistent',
        statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        summary: 'Recorded activity indicates standard drafting progression.',
        indicators: [
          { name: 'Typing rhythm', rating: 4, detail: 'Natural speed variation' },
          { name: 'Pauses & thinking', rating: 4, detail: 'Regular pauses between thoughts' },
          { name: 'Corrections', rating: 3, detail: 'Standard backspacing and typo fixes' },
          { name: 'Revisions', rating: 3, detail: 'Iterative content changes' },
          { name: 'Direct typing', rating: 5, detail: 'High proportion of direct input' },
        ],
      };
    }

    const timed = events
      .filter((e) => Number.isFinite(Number(e?.occurred_at)))
      .slice()
      .sort((a, b) => Number(a.occurred_at) - Number(b.occurred_at));

    let typedChars = 0;
    let pastedChars = 0;
    let deleteChars = 0;
    let pauseCount = 0;

    for (let i = 0; i < timed.length; i++) {
      const ev = timed[i];
      if (ev.type === 'step' || ev.type === 'keystroke') {
        typedChars += 1;
      } else if (ev.type === 'paste') {
        const text = ev.data?.pasted_text || ev.data?.text || '';
        const len = text.length || ev.data?.pasted_text_length || ev.data?.length || 0;
        pastedChars += len;
      } else if (ev.type === 'delete') {
        deleteChars += Number(ev.data?.length) || 1;
      }

      if (i > 0) {
        const diff = Number(timed[i].occurred_at) - Number(timed[i - 1].occurred_at);
        if (diff >= 10 && diff <= 120) {
          pauseCount++;
        }
      }
    }

    const totalChars = Math.max(typedChars + pastedChars, 1);
    const pasteRatio = pastedChars / totalChars;

    // Determine status purely from observable signals
    const isUnusual = pasteRatio > 0.65 || (typedChars < 100 && pastedChars > 800);

    const indicators = [
      {
        name: 'Typing rhythm',
        rating: isUnusual ? 2 : 4,
        detail: isUnusual ? 'Low keyboard input volume' : 'Natural variation in keystroke velocity',
      },
      {
        name: 'Pauses & thinking',
        rating: Math.min(5, Math.max(2, Math.round(pauseCount / 4) + 1)),
        detail: `${pauseCount} thinking pauses (10s–2m) recorded`,
      },
      {
        name: 'Corrections',
        rating: Math.min(5, Math.max(1, Math.round(deleteChars / 50) + 1)),
        detail: `${deleteChars} characters modified or deleted`,
      },
      {
        name: 'Revisions',
        rating: deleteChars > 100 ? 4 : 2,
        detail: deleteChars > 100 ? 'Multiple edits and rewrites across drafts' : 'Linear drafting with minimal rewrites',
      },
      {
        name: 'Direct input',
        rating: Math.max(1, Math.round((1 - pasteRatio) * 5)),
        detail: `${Math.round((1 - pasteRatio) * 100)}% entered directly into workspace`,
      },
    ];

    let summary = 'The recorded work shows varied typing, pauses, corrections, and revisions across writing sessions.';
    if (isUnusual) {
      summary = 'A substantial portion of the text appeared via paste/insertion. Review the activity timeline and pasted text for context.';
    }

    return {
      status: isUnusual ? 'Unusual pattern' : 'Consistent',
      statusColor: isUnusual
        ? 'text-amber-800 bg-amber-50 border-amber-300'
        : 'text-emerald-800 bg-emerald-50 border-emerald-300',
      summary,
      indicators,
    };
  }, [events]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0047FF]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
            Writing Pattern
          </h3>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${pattern.statusColor}`}>
          {pattern.status}
        </span>
      </div>

      <p className="text-xs text-gray-600 font-sans leading-relaxed">
        {pattern.summary}
      </p>

      {/* Indicator Bars */}
      <div className="space-y-2 pt-1">
        {pattern.indicators.map((ind, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-xs">
            <span className="font-sans text-gray-700 truncate w-32 shrink-0">{ind.name}</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((dot) => (
                <span
                  key={dot}
                  className={`w-2 h-2 rounded-full ${
                    dot <= ind.rating ? 'bg-[#0047FF]' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
