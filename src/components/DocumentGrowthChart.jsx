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
      return [{ time: 'Start', words: 0 }, { time: 'Final', words: finalWordCount }];
    }

    const timed = events
      .filter((e) => Number.isFinite(Number(e?.occurred_at)))
      .slice()
      .sort((a, b) => Number(a.occurred_at) - Number(b.occurred_at));

    if (!timed.length) {
      return [{ time: 'Start', words: 0 }, { time: 'Final', words: finalWordCount }];
    }

    // Track approximate document word count through step additions/deletions/pastes
    let currentLength = 0;
    const points = [];
    const firstTime = Number(timed[0].occurred_at);
    const lastTime = Number(timed[timed.length - 1].occurred_at);
    const duration = Math.max(lastTime - firstTime, 1);

    // Initial point
    points.push({
      time: new Date(firstTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      words: 0,
      timestamp: firstTime,
    });

    // Sample across timeline into ~12 evenly distributed buckets
    const BUCKETS = 12;
    const bucketInterval = duration / BUCKETS;
    let nextBucketTime = firstTime + bucketInterval;
    let eventIndex = 0;

    for (let b = 0; b < BUCKETS; b++) {
      while (eventIndex < timed.length && Number(timed[eventIndex].occurred_at) <= nextBucketTime) {
        const ev = timed[eventIndex];
        if (ev.type === 'paste') {
          const text = ev.data?.pasted_text || ev.data?.text || '';
          const len = text.length || ev.data?.pasted_text_length || ev.data?.length || 0;
          currentLength += len;
        } else if (ev.type === 'delete') {
          const delLen = Number(ev.data?.length) || 1;
          currentLength = Math.max(0, currentLength - delLen);
        } else if (ev.type === 'step' || ev.type === 'keystroke') {
          currentLength += 1;
        }
        eventIndex++;
      }

      // Convert characters to estimated words (avg ~5.5 chars per word), capped at finalWordCount if available
      const approxWords = Math.round(currentLength / 5.5);
      points.push({
        time: new Date(nextBucketTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        words: Math.max(approxWords, 0),
        timestamp: nextBucketTime,
      });

      nextBucketTime += bucketInterval;
    }

    // Final point
    points.push({
      time: new Date(lastTime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      words: finalWordCount > 0 ? finalWordCount : Math.round(currentLength / 5.5),
      timestamp: lastTime,
    });

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
              domain={[0, Math.ceil(maxWords * 1.1)]}
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
        Progression of document length from initial keystrokes to final submission.
      </p>
    </div>
  );
}
