import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Zap } from 'lucide-react';

export default function WritingRhythmChart({ events }) {
  const { data, avgWpm, rhythmSummary, hasAbnormalPoint } = useMemo(() => {
    if (!events || !events.length) {
      return { data: [], avgWpm: 0, rhythmSummary: 'No writing velocity data recorded.', hasAbnormalPoint: false };
    }

    const timed = events
      .filter((e) => Number.isFinite(Number(e?.occurred_at)))
      .slice()
      .sort((a, b) => Number(a.occurred_at) - Number(b.occurred_at));

    if (!timed.length) {
      return { data: [], avgWpm: 0, rhythmSummary: 'No writing velocity data recorded.', hasAbnormalPoint: false };
    }

    // Group typing events by active minute buckets
    const minuteBuckets = new Map();

    for (const ev of timed) {
      const timeSec = Number(ev.occurred_at);
      const minuteKey = Math.floor(timeSec / 60) * 60;

      if (!minuteBuckets.has(minuteKey)) {
        minuteBuckets.set(minuteKey, {
          timestamp: minuteKey,
          typedChars: 0,
          keystrokeTimes: [],
        });
      }

      const bucket = minuteBuckets.get(minuteKey);
      if (ev.type === 'step' || ev.type === 'keystroke') {
        bucket.typedChars += 1;
        bucket.keystrokeTimes.push(timeSec);
      }
    }

    // Calculate WPM only for minutes where writing actually occurred
    const activePoints = [];
    const validSpeeds = [];
    let abnormalCount = 0;

    for (const [minuteSec, bucket] of minuteBuckets.entries()) {
      if (bucket.typedChars === 0) continue;

      let activeSecondsInMinute = 60;
      if (bucket.keystrokeTimes.length >= 2) {
        const firstK = bucket.keystrokeTimes[0];
        const lastK = bucket.keystrokeTimes[bucket.keystrokeTimes.length - 1];
        activeSecondsInMinute = Math.max(lastK - firstK, 10);
      }

      const words = bucket.typedChars / 5;
      const minutesActive = activeSecondsInMinute / 60;
      const wpm = Math.max(2, Math.min(180, Math.round(words / minutesActive)));

      validSpeeds.push(wpm);

      // Flag speed points: normal (12-70 WPM) vs high burst (> 85 WPM) vs very low (< 6 WPM)
      const isAbnormalHigh = wpm > 85;
      const isAbnormalLow = wpm < 6 && bucket.typedChars < 10;
      if (isAbnormalHigh) abnormalCount++;

      const timeLabel = new Date(minuteSec * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      activePoints.push({
        time: timeLabel,
        wpm: wpm,
        chars: bucket.typedChars,
        timestamp: minuteSec,
        isAbnormalHigh,
        isAbnormalLow,
        status: isAbnormalHigh ? 'High velocity burst' : (isAbnormalLow ? 'Slow input' : 'Normal typing rhythm'),
        dotColor: isAbnormalHigh ? '#EF4444' : '#0047FF',
      });
    }

    activePoints.sort((a, b) => a.timestamp - b.timestamp);

    const calculatedAvgWpm =
      validSpeeds.length > 0
        ? Math.round(validSpeeds.reduce((a, b) => a + b, 0) / validSpeeds.length)
        : 0;

    let variance = 0;
    if (validSpeeds.length > 1) {
      const avg = calculatedAvgWpm;
      const sqDiffs = validSpeeds.map((s) => Math.pow(s - avg, 2));
      variance = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / validSpeeds.length);
    }

    let rhythmSummary = 'Typing speed naturally varied during the active writing sessions.';
    if (validSpeeds.length < 2) {
      rhythmSummary = 'Short writing duration recorded.';
    } else if (abnormalCount > 0) {
      rhythmSummary = 'Rapid typing burst detected in a specific writing interval (highlighted in red).';
    } else if (variance < 3 && calculatedAvgWpm > 40) {
      rhythmSummary = 'Typing speed remained unusually uniform throughout the session.';
    }

    return {
      data: activePoints,
      avgWpm: calculatedAvgWpm,
      rhythmSummary,
      hasAbnormalPoint: abnormalCount > 0,
    };
  }, [events]);

  if (!data.length) return null;

  const maxWpm = Math.max(...data.map((d) => d.wpm), 40);

  // Custom Dot component to color abnormal points distinctly
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;

    if (payload.isAbnormalHigh) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={7} fill="#EF4444" fillOpacity={0.25} />
          <circle cx={cx} cy={cy} r={4} fill="#EF4444" stroke="#FFFFFF" strokeWidth={1.5} />
        </g>
      );
    }

    return (
      <circle cx={cx} cy={cy} r={3} fill="#0047FF" stroke="#FFFFFF" strokeWidth={1} />
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
            Writing Rhythm
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {hasAbnormalPoint && (
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 uppercase tracking-wider">
              Burst Spike
            </span>
          )}
          <span className="text-[11px] font-mono font-bold text-gray-700">
            Avg {avgWpm} WPM
          </span>
        </div>
      </div>

      <div className="h-40 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#8E8E93', fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: '#E5E5EA' }}
            />
            <YAxis
              domain={[0, Math.ceil(maxWpm * 1.15)]}
              tick={{ fontSize: 10, fill: '#8E8E93', fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="bg-[#1A1A1B] text-white p-2.5 rounded-xl text-xs font-mono shadow-lg space-y-1">
                      <div className="text-gray-400 text-[10px]">{item.time}</div>
                      <div className={`font-bold text-sm ${item.isAbnormalHigh ? 'text-rose-400' : 'text-blue-400'}`}>
                        {item.wpm} WPM
                      </div>
                      <div className="text-[10px] text-gray-300 font-sans">
                        {item.status}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="wpm"
              stroke="#0047FF"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Summary */}
      <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 pt-1 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-blue-700">
            <span className="w-2 h-2 rounded-full bg-[#0047FF]" />
            Natural rhythm
          </span>
          <span className="flex items-center gap-1 text-rose-700">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" />
            High burst (&gt;85 WPM)
          </span>
        </div>
      </div>

      <p className="text-[11px] text-gray-600 font-sans leading-snug">
        {rhythmSummary}
      </p>
    </div>
  );
}
