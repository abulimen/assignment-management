import { useMemo } from 'react';
import { Clock, Zap, Calendar } from 'lucide-react';

/**
 * EffortSummary — replaces EditDensity + EditTimeline.
 * Shows the lecturer plain-English effort facts.
 */
export default function EffortSummary({ events }) {
  const analysis = useMemo(() => {
    if (!events?.length) return null;
    const timed = events.filter((e) => Number.isFinite(e.occurred_at));
    if (!timed.length) return null;
    timed.sort((a, b) => a.occurred_at - b.occurred_at);
    const first = timed[0].occurred_at;
    const last = timed[timed.length - 1].occurred_at;

    const GAP = 120;
    const sessions = [];
    let current = [timed[0]];
    for (let i = 1; i < timed.length; i++) {
      if (timed[i].occurred_at - timed[i - 1].occurred_at > GAP) {
        sessions.push(current);
        current = [];
      }
      current.push(timed[i]);
    }
    sessions.push(current);

    const activeMs = sessions.reduce((sum, s) => {
      return sum + Math.max((s[s.length - 1].occurred_at - s[0].occurred_at) * 1000, 0);
    }, 0);
    const activeMin = Math.max(Math.round(activeMs / 60000), sessions.length > 0 ? 1 : 0);

    const sessionSummaries = sessions.map((s) => ({
      start: s[0].occurred_at,
      end: s[s.length - 1].occurred_at,
      events: s.length,
    }));

    const span = last - first;
    const BUCKETS = 20;
    const bucketSize = Math.max(span / BUCKETS, 1);
    const buckets = Array(BUCKETS).fill(0);
    for (const e of timed) {
      const idx = Math.min(BUCKETS - 1, Math.floor((e.occurred_at - first) / bucketSize));
      buckets[idx]++;
    }
    const maxBucket = Math.max(...buckets, 1);

    const startDate = new Date(first * 1000);
    const endDate = new Date(last * 1000);
    const sameDay = startDate.toDateString() === endDate.toDateString();
    const dateStr = sameDay
      ? startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    return { activeMin, sessions: sessionSummaries, buckets, maxBucket, dateStr };
  }, [events]);

  if (!analysis) return null;

  const { activeMin, sessions, buckets, maxBucket, dateStr } = analysis;
  const avgMin = sessions.length > 0 ? Math.max(Math.round(activeMin / sessions.length), 1) : 0;
  const timeStr = activeMin >= 60
    ? `${Math.floor(activeMin / 60)}h ${activeMin % 60}m`
    : `${activeMin}m`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <Clock className="w-4 h-4 text-[#0047FF]" />
        <h3 className="text-sm font-bold text-[#1A1A1B]">Writing Effort</h3>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#F9F8F6] rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-lg font-black font-mono text-[#1A1A1B]">{timeStr}</div>
          <div className="text-[10px] text-gray-500 font-sans mt-0.5">Time Spent</div>
        </div>
        <div className="bg-[#F9F8F6] rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-lg font-black font-mono text-[#1A1A1B]">{sessions.length}</div>
          <div className="text-[10px] text-gray-500 font-sans mt-0.5">{sessions.length === 1 ? 'Session' : 'Sessions'}</div>
        </div>
        <div className="bg-[#F9F8F6] rounded-xl border border-gray-200 p-3 text-center">
          <div className="text-lg font-black font-mono text-[#1A1A1B]">{avgMin}m</div>
          <div className="text-[10px] text-gray-500 font-sans mt-0.5">Avg / Session</div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
          <Zap className="w-3 h-3" />
          Activity pattern
        </div>
        <div
          className="flex items-end gap-0.5 h-10 bg-[#F9F8F6] rounded-lg border border-gray-200 px-2 py-1.5"
          role="img"
          aria-label="Activity distribution over writing session"
        >
          {buckets.map((count, i) => (
            <div key={i} className="flex-1 h-full flex items-end" title={`${count} events`}>
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: count === 0 ? '0%' : `${Math.max(12, (count / maxBucket) * 100)}%`,
                  backgroundColor: count === 0
                    ? 'transparent'
                    : `rgba(0, 71, 255, ${0.15 + 0.85 * (count / maxBucket)})`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] font-mono text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {dateStr}
          </span>
          <span>{sessions.length > 1 ? `${sessions.length} sessions` : '1 session'}</span>
        </div>
      </div>

      {sessions.length > 1 && (
        <div className="space-y-1.5 pt-1 border-t border-gray-100">
          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Session breakdown</div>
          {sessions.map((s, i) => {
            const dur = Math.max(Math.round((s.end - s.start) / 60), 1);
            const date = new Date(s.start * 1000);
            return (
              <div key={i} className="flex items-center justify-between text-xs font-mono text-gray-600">
                <span className="text-gray-400 w-6">#{i + 1}</span>
                <span className="flex-1 text-center">
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-[#1A1A1B] font-bold">{dur}m</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
