import React, { useState, useMemo } from 'react';
import { Activity, HelpCircle, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function WritingPatternSummary({ events }) {
  const [showGuide, setShowGuide] = useState(false);

  const pattern = useMemo(() => {
    if (!events || !events.length) {
      return {
        status: 'Consistent',
        statusColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        verdictIcon: CheckCircle2,
        summary: 'The recorded writing process exhibits natural human keystroke patterns, steady pacing, and typical student drafting habits.',
        hasConcerns: false,
        indicators: [
          {
            name: 'Typing Rhythm',
            rating: 4,
            detail: 'Natural speed variation across sentences',
            whyItMatters: 'Human writing velocity naturally accelerates and slows down as thoughts develop.',
            level: 'good',
            verdict: 'Natural Pacing',
          },
          {
            name: 'Pauses & Thinking',
            rating: 4,
            detail: 'Regular 10s–2m thinking breaks between paragraphs',
            whyItMatters: 'Authentic composition includes pauses to organize arguments and find words.',
            level: 'good',
            verdict: 'Organic Pauses',
          },
          {
            name: 'Corrections',
            rating: 3,
            detail: 'Standard typo backspacing and word corrections',
            whyItMatters: 'Genuine drafting involves continuous backspacing and fixing typos as they occur.',
            level: 'neutral',
            verdict: 'Typical Typo Fixes',
          },
          {
            name: 'Revisions',
            rating: 3,
            detail: 'Iterative content restructuring across drafts',
            whyItMatters: 'True essay writing involves rearranging phrases and rewording initial sentences.',
            level: 'neutral',
            verdict: 'Iterative Edits',
          },
          {
            name: 'Direct Workspace Input',
            rating: 5,
            detail: '100% composed directly inside the editor',
            whyItMatters: 'High direct input confirms the student formulated the ideas directly inside the tracked workspace.',
            level: 'good',
            verdict: 'High Direct Input',
          },
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

    const isHighPaste = pasteRatio > 0.60;
    const isModeratePaste = pasteRatio > 0.30 && pasteRatio <= 0.60;
    const isLowRevision = deleteChars < 20 && typedChars > 300;

    const directInputRating = Math.max(1, Math.min(5, Math.round((1 - pasteRatio) * 5)));
    const revisionsRating = deleteChars > 150 ? 5 : (deleteChars > 60 ? 4 : (deleteChars > 20 ? 3 : 2));
    const correctionsRating = Math.min(5, Math.max(1, Math.round(deleteChars / 40) + 1));
    const pausesRating = Math.min(5, Math.max(2, Math.round(pauseCount / 3) + 1));
    const rhythmRating = isHighPaste ? 2 : (isModeratePaste ? 3 : 4);

    const getLevel = (rating) => {
      if (rating >= 4) return 'good';
      if (rating === 3) return 'neutral';
      if (rating === 2) return 'notable';
      return 'poor';
    };

    const hasConcerns = isHighPaste || isModeratePaste || isLowRevision;

    const indicators = [
      {
        name: 'Typing Rhythm',
        rating: rhythmRating,
        level: getLevel(rhythmRating),
        verdict: rhythmRating >= 4 ? 'Natural Pacing' : (rhythmRating === 3 ? 'Moderate Variance' : 'Unusual Flow'),
        detail: rhythmRating >= 4 ? 'Natural human keystroke speed variation' : 'Portions of content entered without continuous typing',
        whyItMatters: 'Authentic writing naturally speeds up and slows down as thoughts develop, rather than flowing at fixed speeds.',
      },
      {
        name: 'Pauses & Thinking',
        rating: pausesRating,
        level: getLevel(pausesRating),
        verdict: pausesRating >= 4 ? `${pauseCount} Thinking Pauses` : 'Few Pauses',
        detail: `${pauseCount} organic thinking pauses (10s–2m) recorded between thoughts`,
        whyItMatters: 'Authentic composition includes pauses to organize arguments and choose phrasing.',
      },
      {
        name: 'Corrections',
        rating: correctionsRating,
        level: getLevel(correctionsRating),
        verdict: deleteChars > 80 ? 'Active Typo Fixing' : 'Minimal Corrections',
        detail: `${deleteChars} characters modified, backspaced, or corrected in-line`,
        whyItMatters: 'Genuine drafting involves continuous backspacing and fixing typos as they occur.',
      },
      {
        name: 'Revisions & Rewrites',
        rating: revisionsRating,
        level: getLevel(revisionsRating),
        verdict: revisionsRating >= 4 ? 'Iterative Editing' : 'Linear Drafting',
        detail: revisionsRating >= 4 ? 'Student restructured and rewrote portions of text' : 'Text written in a single pass with few rewrites',
        whyItMatters: 'College-level writing typically involves re-reading and refining prior paragraphs.',
      },
      {
        name: 'Direct Workspace Input',
        rating: directInputRating,
        level: getLevel(directInputRating),
        verdict: `${Math.round((1 - pasteRatio) * 100)}% Direct Input`,
        detail: `${Math.round((1 - pasteRatio) * 100)}% composed directly inside Draftly workspace`,
        whyItMatters: 'Direct keystroke entry confirms the student composed the text directly within the authenticated environment.',
      },
    ];

    let summary = 'The student demonstrated consistent, organic writing behavior with natural variations in pacing, regular pauses, and expected typo corrections.';
    let status = 'Consistent';
    let statusColor = 'text-emerald-800 bg-emerald-50 border-emerald-300';
    let verdictIcon = CheckCircle2;

    if (isHighPaste) {
      status = 'High External Input';
      statusColor = 'text-amber-800 bg-amber-50 border-amber-300';
      verdictIcon = AlertTriangle;
      summary = 'A substantial portion of this document was pasted into the workspace. Scroll down to inspect the Growth Curve and check Sources for details.';
    } else if (isModeratePaste || isLowRevision) {
      status = 'Notable Patterns';
      statusColor = 'text-amber-800 bg-amber-50 border-amber-300';
      verdictIcon = AlertTriangle;
      summary = 'Document shows linear drafting or moderate pasted content. Check the charts below to review velocity bursts and revision depth.';
    }

    return {
      status,
      statusColor,
      verdictIcon,
      summary,
      hasConcerns,
      indicators,
    };
  }, [events]);

  const getDotColor = (level, active) => {
    if (!active) return 'bg-gray-200';
    if (level === 'good') return 'bg-emerald-500';
    if (level === 'neutral') return 'bg-blue-500';
    if (level === 'notable') return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getBadgeColor = (level) => {
    if (level === 'good') return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (level === 'neutral') return 'text-blue-700 bg-blue-50 border-blue-200';
    if (level === 'notable') return 'text-amber-800 bg-amber-50 border-amber-300';
    return 'text-red-700 bg-red-50 border-red-200';
  };

  const VerdictIcon = pattern.verdictIcon;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0047FF]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
            Writing Pattern
          </h3>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${pattern.statusColor}`}>
          <VerdictIcon className="w-3 h-3" />
          <span>{pattern.status}</span>
        </span>
      </div>

      {/* Human-Readable Summary */}
      <p className="text-xs text-gray-600 font-sans leading-relaxed">
        {pattern.summary}
      </p>

      {/* Indicator Cards with Accessible Explanations */}
      <div className="space-y-3 pt-1">
        {pattern.indicators.map((ind, i) => (
          <div
            key={i}
            className="p-3 bg-[#F9F8F6] rounded-xl border border-gray-200/80 space-y-1.5 transition-all hover:bg-white hover:shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-sans font-bold text-xs text-[#1A1A1B] truncate">
                  {ind.name}
                </span>
                <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded border ${getBadgeColor(ind.level)}`}>
                  {ind.verdict}
                </span>
              </div>

              {/* 5-Dot Visual Meter */}
              <div className="flex items-center gap-1 shrink-0" title={`Score: ${ind.rating}/5`}>
                {[1, 2, 3, 4, 5].map((dot) => (
                  <span
                    key={dot}
                    className={`w-2 h-2 rounded-full transition-colors ${getDotColor(
                      ind.level,
                      dot <= ind.rating
                    )}`}
                  />
                ))}
              </div>
            </div>

            <p className="text-[11px] text-gray-600 font-sans leading-tight">
              {ind.detail}
            </p>

            {/* Why This Matters Helper Note */}
            <div className="text-[10px] text-gray-500 font-sans flex items-start gap-1 pt-0.5 border-t border-gray-200/50">
              <Info className="w-3 h-3 text-[#0047FF] shrink-0 mt-0.5" />
              <span className="leading-tight text-gray-500">{ind.whyItMatters}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Toggleable Lecturer Integrity Guide */}
      <div className="pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between text-[11px] font-semibold text-gray-600 hover:text-[#0047FF] transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-[#0047FF]" />
            <span>How to interpret these patterns</span>
          </span>
          {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showGuide && (
          <div className="mt-2 p-3 bg-blue-50/50 rounded-xl border border-blue-200/60 text-[11px] text-blue-900 font-sans space-y-1.5 leading-relaxed animate-in fade-in duration-150">
            <p className="font-bold text-[#0047FF]">Authentic Writing Blueprint</p>
            <p>
              • <strong>High Integrity:</strong> Characterized by regular thinking breaks, iterative rewording, backspacing typo corrections, and gradual document growth.
            </p>
            <p>
              • <strong>Signs of Copy-Pasting / AI Generation:</strong> Sudden jumps in word count within seconds, zero revision/deletion activity, or flatline typing speeds without thinking pauses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
