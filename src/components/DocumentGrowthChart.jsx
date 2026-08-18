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
import { TrendingUp } from 'lucide-react';

export default function DocumentGrowthChart({ events, finalWordCount = 0 }) {
  const data = useMemo(() => {
    if (!events || !events.length) {
      return [
        { time: 'Start', words: 0 },
        { time: 'Final', words: finalWordCount },
      ];
    }

    // Filter and sort all timed events chronologically
    const timed = events
      .filter((e) => Number.isFinite(Number(e?.occurred_at)))
      .slice()
      .sort((a, b) => Number(a.occurred_at) - Number(b.occurred_at));

    if (!timed.length) {
      return [
        { time: 'Start', words: 0 },
        { time: 'Final', words: finalWordCount },
      ];
    }

    const firstTime = Number(timed[0].occurred_at);
    const lastTime = Number(timed[timed.length - 1].occurred_at);

    // Track running character count accurately
    let runningChars = 0;
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
        history.push({ timestamp: timeSec, chars: runningChars });
      } else if (ev.type === 'delete') {
        const delLen = Number(ev.data?.length) || 1;
        runningChars = Math.max(0, runningChars - delLen);
        history.push({ timestamp: timeSec, chars: runningChars });
      } else if (ev.type === 'step' || ev.type === 'keystroke') {
        runningChars += 1;
        // Record point on typing
        if (runningChars % 15 === 0 || i === timed.length - 1) {
          history.push({ timestamp: timeSec, chars: runningChars });
        }
      }
    }

    // Final point
    const maxCharsRecorded = Math.max(...history.map((h) => h.chars), 1);
    const finalTargetWords = finalWordCount > 0 ? finalWordCount : Math.round(maxCharsRecorded / 5.5);

    // Scale character progression accurately to target words
    const charToWordRatio = finalTargetWords > 0 && maxCharsRecorded > 0 ? finalTargetWords / maxCharsRecorded : 1 / 5.5;

    // Build distinct minute-by-minute / key active points
    const pointsMap = new Map();

    for (const h of history) {
      const date = new Date(h.timestamp * 1000);
      const timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const currentWords = Math.min(
        finalTargetWords,
        Math.max(0, Math.round(h.chars * charToWordRatio))
      );

      // Keep the latest word count for each active minute
      pointsMap.set(timeLabel, {
        time: timeLabel,
        words: currentWords,
        timestamp: h.timestamp,
      });
    }

    const points = Array.from(pointsMap.values());

    // Ensure first and last points are clean
    if (points.length > 0) {
      points[0].words = 0;
      points[points.length - 1].words = finalTargetWords;
    }

    return points;
  }, [events, finalWordCount]);

  const maxWords = Math.max(...data.map((d) => d.words), finalWordCount, 10);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#0047FF]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
            Document Growth
          </h3>
        </div>
        <span className="text-[10px] font-mono text-gray-400">Word count over time</span>
      </div>

      <div className="h-44 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0047FF" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0047FF" stopOpacity={0.0} />
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
                    <div className="bg-[#1A1A1B] text-white p-2 rounded-lg text-xs font-mono shadow-lg">
                      <div className="text-gray-400 text-[10px]">{payload[0].payload.time}</div>
                      <div className="font-bold text-sm text-[#4D82FF]">
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
              stroke="#0047FF"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#growthGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-gray-500 font-sans leading-snug">
        Progression of document length from initial keystrokes to final submission ({finalWordCount} words).
      </p>
    </div>
  );
}
