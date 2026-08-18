import { useMemo } from 'react';
import { Activity } from 'lucide-react';

export default function EditDensity({ events, totalTimeMs }) {
  const buckets = useMemo(() => {
    if (!events?.length) return [];

    const times = events.filter((e) => e.occurred_at != null).map((e) => e.occurred_at);
    if (times.length === 0) return [];

    const first = Math.min(...times);
    const last = Math.max(...times);
    const duration = last - first;
    if (duration <= 0) return [];

    const bucketSize = Math.max(duration / 20, 5);

    const map = {};
    for (const e of events) {
      const bucket = Math.floor((e.occurred_at - first) / bucketSize);
      map[bucket] = (map[bucket] || 0) + 1;
    }

    const max = Math.max(...Object.values(map), 1);
    return Object.entries(map).map(([bucket, count]) => ({
      bucket: parseInt(bucket),
      time: first + parseInt(bucket) * bucketSize,
      count,
      height: (count / max) * 100,
    }));
  }, [events]);

  if (!buckets.length) return null;
  const peakCount = buckets.reduce((m, b) => Math.max(m, b.count), 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <Activity className="w-4 h-4 text-[#0047FF]" />
        <h3 className="text-sm font-bold text-[#1A1A1B]">Writing Pace & Activity</h3>
      </div>

      <div
        className="flex items-end gap-1.5 h-28 bg-[#F9F8F6] p-3 rounded-xl border border-gray-200"
        role="img"
        aria-label={`Bar chart of edit volume over time. ${buckets.length} time buckets; peak ${peakCount} events in a single bucket.`}
      >
        <span className="sr-only">
          Peak {peakCount} edits in one bucket; {buckets[buckets.length - 1]?.count} in the last.
        </span>
        {buckets.map((b, i) => (
          <div key={i} className="flex-1 relative group h-full flex items-end" title={`${b.count} events`}>
            <div
              className="bg-[#0047FF]/75 rounded-t hover:bg-[#0047FF] transition-colors w-full"
              style={{ height: `${Math.max(b.height, 6)}%` }}
            />
            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-[#1A1A1B] text-white text-[10px] font-mono px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
              {b.count} events
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-[11px] font-mono text-gray-500">
        <span>Session Start: {buckets[0] ? new Date(buckets[0].time * 1000).toLocaleTimeString() : ''}</span>
        <span>Session End: {buckets[buckets.length - 1] ? new Date(buckets[buckets.length - 1].time * 1000).toLocaleTimeString() : ''}</span>
      </div>
    </div>
  );
}