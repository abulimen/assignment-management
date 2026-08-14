import { useMemo } from 'react';

export default function EditDensity({ events, totalTimeMs }) {
  const buckets = useMemo(() => {
    if (!events?.length) return [];

    // Find actual time range (events may not be sorted by time)
    const times = events.filter(e => e.occurred_at != null).map(e => e.occurred_at);
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
    <div className="bg-surface rounded-xl border border-line p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Timeline</h3>
      <div className="flex items-end gap-0.5 h-24" role="img"
        aria-label={`Bar chart of edit volume over time. ${buckets.length} time buckets; peak ${peakCount} events in a single bucket.`}>
        <span className="sr-only">Peak {peakCount} edits in one bucket; {buckets[buckets.length - 1]?.count} in the last.</span>
        {buckets.map((b, i) => (
          <div key={i} className="flex-1 relative group" title={`${b.count} events`}>
            <div
              className="bg-primary-400 rounded-t hover:bg-primary-500 transition-colors w-full"
              style={{ height: `${Math.max(b.height, 2)}%` }}
            />
            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
              {b.count} events
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>{buckets[0] ? new Date(buckets[0].time * 1000).toLocaleTimeString() : ''}</span>
        <span>{buckets[buckets.length - 1] ? new Date(buckets[buckets.length - 1].time * 1000).toLocaleTimeString() : ''}</span>
      </div>
    </div>
  );
}