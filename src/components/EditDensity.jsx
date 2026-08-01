import { useMemo } from 'react';

export default function EditDensity({ events, totalTimeMs }) {
  const buckets = useMemo(() => {
    if (!events?.length) return [];
    const first = events[0].occurred_at;
    const last = events[events.length - 1].occurred_at;
    const duration = last - first;
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Timeline</h3>
      <div className="flex items-end gap-0.5 h-24">
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
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>{buckets[0] ? new Date(buckets[0].time * 1000).toLocaleTimeString() : ''}</span>
        <span>{buckets[buckets.length - 1] ? new Date(buckets[buckets.length - 1].time * 1000).toLocaleTimeString() : ''}</span>
      </div>
    </div>
  );
}