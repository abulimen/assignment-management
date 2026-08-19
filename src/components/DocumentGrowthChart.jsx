import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export default function DocumentGrowthChart({ events, finalWordCount = 0 }) {
  const { data, isSurge, growthSummary } = useMemo(() => {
    if (!events || !events.length) {
      return {
        data: [
          { time: 'Start', words: 0 },
          { time: 'Final', words: finalWordCount },
        ],
        isSurge: false,
        growthSummary: 'Gradual organic progression of content formulation across time.',
      };
    }

    // Filter and sort all timed events chronologically
    const timed = events
      .filter((e) => Number.isFinite(Number(e?.occurred_at)))
      .slice()
      .sort((a, b) => Number(a.occurred_at) - Number(b.occurred_at));

    if (!timed.length) {
      return {
        data: [
          { time: 'Start', words: 0 },
          { time: 'Final', words: finalWordCount },
        ],
        isSurge: false,
        growthSummary: 'Gradual organic progression of content formulation across time.',
      };
    }

    const firstTime = Number(timed[0].occurred_at);

    // Track running character count accurately
    let runningChars = 0;
    let pastedChars = 0;
    let typedChars = 0;
    const history = [];

    history.push({
      timestamp: firstTime,
      chars: 0,
    });

    for (let i = 0; i < timed.length; i++) {
      const ev = timed[i];
      const timeSec = Number(ev.occurred_at);

      if (ev.type === 'paste') {
        const text = ev.data?.pasted_text || ev.data?.text || '';
        const len = text.length || ev.data?.pasted_text_length || ev.data?.length || 0;
        runningChars += len;
        pastedChars += len;
        history.push({ timestamp: timeSec, chars: runningChars });
      } else if (ev.type === 'delete') {
        const delLen = Number(ev.data?.length) || 1;
        runningChars = Math.max(0, runningChars - delLen);
        history.push({ timestamp: timeSec, chars: runningChars });
      } else if (ev.type === 'step' || ev.type === 'keystroke') {
        runningChars += 1;
        typedChars += 1;
        if (runningChars % 15 === 0 || i === timed.length - 1) {
          history.push({ timestamp: timeSec, chars: runningChars });
        }
      }
    }

    const maxCharsRecorded = Math.max(...history.map((h) => h.chars), 1);
    const finalTargetWords = finalWordCount > 0 ? finalWordCount : Math.round(maxCharsRecorded / 5.5);
    const charToWordRatio = finalTargetWords > 0 && maxCharsRecorded > 0 ? finalTargetWords / maxCharsRecorded : 1 / 5.5;

    const pointsMap = new Map();
    for (const h of history) {
      const date = new Date(h.timestamp * 1000);
      const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const currentWords = Math.min(
        finalTargetWords,
        Math.max(0, Math.round(h.chars * charToWordRatio))
      );

      pointsMap.set(timeLabel, {
        time: timeLabel,
        words: currentWords,
        timestamp: h.timestamp,
      });
    }

    const points = Array.from(pointsMap.values());
    if (points.length > 0) {
      points[0].words = 0;
      points[points.length - 1].words = finalTargetWords;
    }

    const totalChars = Math.max(typedChars + pastedChars, 1);
    const isSurge = pastedChars / totalChars > 0.50 || (typedChars < 80 && finalTargetWords > 120);

    return {
      data: points,
      isSurge,
      growthSummary: isSurge
        ? 'Rapid vertical surge: a substantial volume of words appeared in a single step or short burst.'
        : `Steady progressive growth: words accumulated gradually across the writing session (${finalTargetWords} total words).`,
    };
  }, [events, finalWordCount]);

  const maxWords = Math.max(...data.map((d) => d.words), finalWordCount, 10);
  const themeColor = isSurge ? '#F59E0B' : '#0047FF';
  const gradientId = isSurge ? 'surgeGradient' : 'growthGradient';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: themeColor }} />
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-800">
              Document Growth
            </h3>
            <span className="text-[10px] text-gray-500 font-sans">
              Word Count Over Time
            </span>
          </div>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 shadow-2xs ${
          isSurge
            ? 'text-amber-800 bg-amber-50 border-amber-300'
            : 'text-emerald-800 bg-emerald-50 border-emerald-300'
        }`}>
          {isSurge ? <AlertTriangle className="w-3 h-3 text-amber-600" /> : <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
          <span>{isSurge ? 'Sudden Surge' : 'Gradual Expansion'}</span>
        </span>
      </div>

      <div className="h-44 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={themeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={themeColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#8E8E93', fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E5EA' }}
            />
            <YAxis
              domain={[0, Math.ceil(maxWords * 1.15)]}
              tick={{ fontSize: 10, fill: '#8E8E93', fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#1A1A1B] text-white p-2.5 rounded-xl text-xs font-mono shadow-lg border border-white/10">
                      <div className="text-gray-400 text-[10px]">{payload[0].payload.time}</div>
                      <div className="font-bold text-sm" style={{ color: themeColor }}>
                        {payload[0].value} words
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="words"
              stroke={themeColor}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Explanation Note */}
      <div className="text-[11px] text-gray-600 font-sans leading-relaxed pt-1 border-t border-gray-100 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 text-[#0047FF] shrink-0 mt-0.5" />
        <span>{growthSummary}</span>
      </div>
    </div>
  );
}
