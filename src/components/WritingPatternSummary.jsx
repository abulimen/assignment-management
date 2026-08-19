import React, { useState, useMemo } from 'react';
import { Activity, HelpCircle, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Info, ShieldCheck, Sparkles, BookOpen } from 'lucide-react';

export default function WritingPatternSummary({ events }) {
  const [showGuide, setShowGuide] = useState(false);

  const pattern = useMemo(() => {
    if (!events || !events.length) {
      return {
        status: 'Consistent',
        statusColor: 'text-emerald-800 bg-emerald-50 border-emerald-300',
        verdictIcon: CheckCircle2,
        summary: 'The student demonstrated consistent, organic writing behavior with natural keystroke pacing, regular thinking pauses, and expected typo corrections.',
        hasConcerns: false,
        indicators: [
          {
            name: 'Typing Rhythm',
            subtitle: 'Keystroke Speed & Natural Flow',
            rating: 4,
            detail: 'Natural speed variation across sentences (15–65 WPM range)',
            whyItMatters: 'Human typing speed naturally speeds up during easy phrasing and slows down during complex thoughts.',
            level: 'good',
            verdict: 'Natural Flow',
          },
          {
            name: 'Pauses & Thinking',
            subtitle: 'Deliberation & Structuring Breaks',
            rating: 4,
            detail: 'Regular 10s–2m thinking pauses recorded between paragraphs',
            whyItMatters: 'Authentic composition includes pauses to organize arguments, check sources, and formulate sentences.',
            level: 'good',
            verdict: 'Organic Pauses',
          },
          {
            name: 'In-line Corrections',
            subtitle: 'Typo Backspacing & Word Edits',
            rating: 3,
            detail: 'Standard typo backspacing and word corrections while drafting',
            whyItMatters: 'Genuine drafting involves continuous backspacing and fixing typos as thoughts emerge.',
            level: 'neutral',
            verdict: 'Standard Typo Fixes',
          },
          {
            name: 'Revisions & Rewrites',
            subtitle: 'Paragraph & Idea Structuring',
            rating: 3,
            detail: 'Iterative content restructuring and sentence refining',
            whyItMatters: 'College-level writing typically involves re-reading and refining prior paragraphs.',
            level: 'neutral',
            verdict: 'Iterative Refining',
          },
          {
            name: 'Direct Workspace Input',
            subtitle: 'Editor Keystrokes vs Pasted Text',
            rating: 5,
            detail: '100% composed directly inside Draftly workspace',
            whyItMatters: 'Direct keystroke entry confirms the student composed the text directly within the authenticated environment.',
            level: 'good',
            verdict: '100% Direct Input',
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
    const isLowRevision = deleteChars < 20 && typedChars > 250;

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
        subtitle: 'Keystroke Speed & Natural Flow',
        rating: rhythmRating,
        level: getLevel(rhythmRating),
        verdict: rhythmRating >= 4 ? 'Natural Flow' : (rhythmRating === 3 ? 'Moderate Variance' : 'Unusual Flow'),
        detail: rhythmRating >= 4 ? 'Natural human keystroke speed variation across sentences' : 'Portions of content entered without continuous typing flow',
        whyItMatters: 'Human writing velocity naturally accelerates and slows down as thoughts develop, rather than flowing at fixed robotic speeds.',
      },
      {
        name: 'Pauses & Thinking',
        subtitle: 'Deliberation & Structuring Breaks',
        rating: pausesRating,
        level: getLevel(pausesRating),
        verdict: pausesRating >= 4 ? `${pauseCount} Thinking Pauses` : (pausesRating === 3 ? 'Few Pauses' : 'Minimal Pauses'),
        detail: `${pauseCount} organic thinking pauses (10s–2m) recorded between sentences and paragraphs`,
        whyItMatters: 'Authentic student composition includes regular pauses to organize arguments, recall facts, and find the right wording.',
      },
      {
        name: 'In-line Corrections',
        subtitle: 'Typo Backspacing & Word Fixes',
        rating: correctionsRating,
        level: getLevel(correctionsRating),
        verdict: deleteChars > 60 ? 'Active Typo Fixing' : (deleteChars > 15 ? 'Moderate Corrections' : 'Minimal Corrections'),
        detail: `${deleteChars} characters modified, backspaced, or corrected in-line while drafting`,
        whyItMatters: 'Genuine drafting involves continuous backspacing and fixing typos as words are typed.',
      },
      {
        name: 'Revisions & Rewrites',
        subtitle: 'Paragraph & Idea Structuring',
        rating: revisionsRating,
        level: getLevel(revisionsRating),
        verdict: revisionsRating >= 4 ? 'Iterative Refining' : (revisionsRating === 3 ? 'Light Editing' : 'Linear / Single-Pass'),
        detail: revisionsRating >= 4 ? 'Student actively restructured and rewrote portions of text' : (revisionsRating === 3 ? 'Light sentence edits across the draft' : 'Text was written linearly in a single pass with very few rewrites'),
        whyItMatters: 'College-level writing typically involves re-reading and refining prior paragraphs rather than producing polished final text in a single pass.',
      },
      {
        name: 'Direct Workspace Input',
        subtitle: 'Editor Keystrokes vs Pasted Text',
        rating: directInputRating,
        level: getLevel(directInputRating),
        verdict: `${Math.round((1 - pasteRatio) * 100)}% Direct Input`,
        detail: `${Math.round((1 - pasteRatio) * 100)}% composed directly inside Draftly workspace (${typedChars.toLocaleString()} chars typed)`,
        whyItMatters: 'Direct keystroke entry confirms the student composed the text directly within the authenticated workspace rather than copying external blocks.',
      },
    ];

    let summary = 'The student demonstrated consistent, organic writing behavior with natural variations in pacing, regular thinking pauses, and expected typo corrections.';
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
      summary = 'Document shows linear drafting or moderate external input. Check the charts below to review velocity bursts and revision depth.';
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

  const getBarColor = (level) => {
    if (level === 'good') return 'bg-emerald-500';
    if (level === 'neutral') return 'bg-blue-500';
    if (level === 'notable') return 'bg-amber-500';
    return 'bg-red-500';
  };

  const VerdictIcon = pattern.verdictIcon;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      {/* Header with Plain-English Status */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#0047FF]" />
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-800">
              Writing Pattern
            </h3>
            <span className="text-[10px] text-gray-500 font-sans">
              Authenticity & Drafting Behavior
            </span>
          </div>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 shadow-2xs ${pattern.statusColor}`}>
          <VerdictIcon className="w-3 h-3" />
          <span>{pattern.status}</span>
        </span>
      </div>

      {/* Human-Readable Narrative Summary */}
      <div className="p-3 bg-[#F9F8F6] rounded-xl border border-gray-200/80 text-xs text-gray-700 font-sans leading-relaxed">
        {pattern.summary}
      </div>

      {/* Quick Visual Color Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-gray-500 px-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Organic / Human</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span>Expected Baseline</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
          <span>Review Worthy</span>
        </span>
      </div>

      {/* 5 Clear Indicator Cards with Plain-English Explanations */}
      <div className="space-y-3 pt-1">
        {pattern.indicators.map((ind, i) => (
          <div
            key={i}
            className="p-3.5 bg-[#F9F8F6] rounded-xl border border-gray-200/80 space-y-2 transition-all hover:bg-white hover:shadow-2xs"
          >
            {/* Top Row: Name, Subtitle & Verdict Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-xs text-[#1A1A1B] font-sans">
                  {ind.name}
                </div>
                <div className="text-[10px] text-gray-500 font-sans">
                  {ind.subtitle}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border shadow-2xs ${getBadgeColor(ind.level)}`}>
                  {ind.verdict}
                </span>

                {/* 5-Dot Visual Meter */}
                <div className="flex items-center gap-1" title={`Score: ${ind.rating}/5`}>
                  {[1, 2, 3, 4, 5].map((dot) => (
                    <span
                      key={dot}
                      className={`w-1.5 h-1.5 rounded-full transition-colors ${getDotColor(
                        ind.level,
                        dot <= ind.rating
                      )}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Row: Concrete Measured Detail */}
            <p className="text-[11px] text-gray-700 font-sans leading-snug font-medium">
              {ind.detail}
            </p>

            {/* Bottom Row: Why This Matters to Lecturers */}
            <div className="text-[10px] text-gray-500 font-sans flex items-start gap-1.5 pt-1.5 border-t border-gray-200/60 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-[#0047FF] shrink-0 mt-0.5" />
              <span>
                <strong className="text-gray-600">Why it matters:</strong> {ind.whyItMatters}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Toggleable Lecturer Assessment Guide */}
      <div className="pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full flex items-center justify-between text-[11px] font-semibold text-gray-600 hover:text-[#0047FF] transition-colors py-1 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-[#0047FF]" />
            <span>Lecturer Guide: How to interpret drafting metrics</span>
          </span>
          {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showGuide && (
          <div className="mt-2 p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/60 text-[11px] text-blue-900 font-sans space-y-2 leading-relaxed animate-in fade-in duration-150">
            <p className="font-bold text-[#0047FF] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Authentic Student Drafting Blueprint
            </p>
            <div className="space-y-1 text-blue-950/80">
              <p>
                • <strong>High Integrity Indicators (🟢):</strong> Characterized by variable keystroke pacing, regular thinking pauses (10s–2m), continuous in-line typo backspacing, and gradual document growth.
              </p>
              <p>
                • <strong>Potential AI / External Paste Signs (🟡 / 🔴):</strong> Instant vertical surges in word count, zero revision/deletion activity (single-pass final text), or uniform robotic typing speeds with zero deliberation pauses.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
