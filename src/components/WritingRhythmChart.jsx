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
import { Zap, Clock } from 'lucide-react';

export default function WritingRhythmChart({ events }) {
  const { data, avgWpm, rhythmSummary } = useMemo(() => {
    if (!events || !events.length) {
      return { data: [], avgWpm: 0, rhythmSummary: 'No writing velocity data recorded.' };
    }

    const timed = events
      .filter((e) => Number.isFinite(Number(e?.occurred_at)))
      .slice()
      .sort((a, b) => Number(a.occurred_at) - Number(b.occurred_at));

    if (!timed.length) {
      return { data: [], avgWpm: 0, rhythmSummary: 'No writing velocity data recorded.' };
    }

    // Measure rolling speed across 30-second windows
    const WINDOW_SEC = 30;
    const firstTime = Number(timed[0].occurred_at);
    const lastTime = Number(timed[timed.length - 1].occurred_at);
    const duration = Math.max(lastTime - firstTime, 1);

    const points = [];
    let windowStart = firstTime;
    let windowEnd = firstTime + WINDOW_SEC;
    let eventIdx = 0;
    const speeds = [];

    while (windowStart <= lastTime) {
      let charsInWindow = 0;
      let pausesInWindow = 0;

      while (eventIdx < timed.length && Number(timed[eventIdx].occurred_at) < windowEnd) {
        const ev = timed[eventIdx];
        if (ev.type === 'step' || ev.type === 'keystroke') {
          charsInWindow += 1;
        } else if (ev.type === 'paste') {
          // paste characters don't count toward typing speed
        }
        eventIdx++;
      }

      // WPM = (chars / 5) / (minutes)
      const wordsInWindow = charsInWindow / 5;
      const minutes = WINDOW_SEC / 60;
      const wpm = Math.round(wordsInWindow / minutes);

      if (charsInWindow > 0) {
        speeds.push(wpm);
      }

      points.push({
        time: new Date(windowStart * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        wpm: wpm,
      });

      windowStart += WINDOW_SEC;
      windowEnd += WINDOW_SEC;
    }

    // Calculate variance/standard deviation of typing velocity
    const calculatedAvgWpm =
      speeds.length > 0 ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;

    let variance = 0;
    if (speeds.length > 1) {
      const avg = calculatedAvgWpm;
      const sqDiffs = speeds.map((s) => Math.pow(s - avg, 2));
      variance = Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / speeds.length);
    }

    let rhythmSummary = 'Typing speed naturally varied during the active writing sessions.';
    if (speeds.length < 3) {
      rhythmSummary = 'Short session duration with few continuous typing windows.';
    } else if (variance < 2 && calculatedAvgWpm > 40) {
      rhythmSummary = 'Typing speed remained unusually uniform throughout the session.';
    } else if (calculatedAvgWpm > 95) {
      rhythmSummary = 'Sustained high-velocity typing recorded across active periods.';
    }

    // Downsample points if there are too many (e.g. max 20 data points for a clean graph)
    const MAX_POINTS = 20;
    let sampledPoints = points;
    if (points.length > MAX_POINTS) {
      const step = Math.ceil(points.length / MAX_POINTS);
      sampledPoints = points.filter((_, i) => i % step === 0);
    }

    return {
      data: sampledPoints,
      avgWpm: calculatedAvgWpm,
      rhythmSummary,
    };
  }, [events]);

  if (!data.length) return null;

  const maxWpm = Math.max(...data.map((d) => d.wpm), 40);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
            Writing Rhythm
          </h3>
        </div>
        <span className="text-[11px] font-mono font-bold text-gray-700">
          Avg {avgWpm} WPM
        </span>
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
                  return (
                    <div className="bg-[#1A1A1B] text-white p-2 rounded-lg text-xs font-mono shadow-lg">
                      <div className="text-gray-400 text-[10px]">{payload[0].payload.time}</div>
                      <div className="font-bold text-sm text-amber-400">
                        {payload[0].value} WPM
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
              stroke="#D97706"
              strokeWidth={2}
              dot={{ r: 2, fill: '#D97706' }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-gray-600 font-sans leading-snug">
        {rhythmSummary}
      </p>
    </div>
  );
}
