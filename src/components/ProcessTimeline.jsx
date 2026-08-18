import React, { useMemo } from 'react';
import {
  Clock,
  FileText,
  Edit3,
  Clipboard,
  CheckCircle2,
  Lock,
  Calendar,
  Activity,
  AlertCircle,
} from 'lucide-react';

export default function ProcessTimeline({ events, onSeekToEvent, currentStepIndex = null }) {
  // 1. Process Overview & Activity Pattern computation
  const activityOverview = useMemo(() => {
    if (!events || !events.length) return null;

    const timed = events
      .filter((e) => Number.isFinite(Number(e?.occurred_at)))
      .slice()
      .sort((a, b) => Number(a.occurred_at) - Number(b.occurred_at));

    if (!timed.length) return null;

    const first = Number(timed[0].occurred_at);
    const last = Number(timed[timed.length - 1].occurred_at);

    // Group into sessions (> 2 min gap)
    const GAP = 120;
    const sessions = [];
    let curSession = [timed[0]];

    for (let i = 1; i < timed.length; i++) {
      if (Number(timed[i].occurred_at) - Number(timed[i - 1].occurred_at) > GAP) {
        sessions.push(curSession);
        curSession = [];
      }
      curSession.push(timed[i]);
    }
    if (curSession.length) sessions.push(curSession);

    // Calculate active duration across sessions
    const activeSec = sessions.reduce((sum, s) => {
      const start = Number(s[0].occurred_at);
      const end = Number(s[s.length - 1].occurred_at);
      return sum + Math.max(end - start, 1);
    }, 0);

    const activeMinutes = Math.max(Math.round(activeSec / 60), sessions.length > 0 ? 1 : 0);
    const timeDisplay =
      activeMinutes >= 60
        ? `${Math.floor(activeMinutes / 60)}h ${activeMinutes % 60}m`
        : `${activeMinutes}m`;

    // Group activity by day
    const dayMap = {};
    for (const e of timed) {
      const dateKey = new Date(Number(e.occurred_at) * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      dayMap[dateKey] = (dayMap[dateKey] || 0) + 1;
    }

    const dayEntries = Object.entries(dayMap).map(([day, count]) => ({ day, count }));
    const maxDayCount = Math.max(...dayEntries.map((d) => d.count), 1);

    // Factual pattern summary
    let patternSummary = 'Work occurred across multiple sessions.';
    if (sessions.length === 1) {
      patternSummary = 'Recorded activity occurred within a single writing session.';
    } else if (dayEntries.length === 1) {
      patternSummary = `Activity occurred across ${sessions.length} sessions on a single day.`;
    } else {
      patternSummary = `Activity occurred across ${sessions.length} sessions over ${dayEntries.length} days.`;
    }

    // Detect observable process characteristics
    const notableObservations = [];

    // 1. Large single paste event (> 500 chars)
    const largePastes = timed.filter(
      (e) =>
        e.type === 'paste' &&
        (e.data?.pasted_text?.length > 400 || (e.data?.pasted_text_length || 0) > 400)
    );
    if (largePastes.length > 0) {
      const totalChars = largePastes.reduce(
        (sum, p) => sum + (p.data?.pasted_text?.length || p.data?.pasted_text_length || 0),
        0
      );
      notableObservations.push({
        id: 'obs-large-paste',
        text: `Large text insertion: ${totalChars.toLocaleString()} characters entered via paste event.`,
      });
    }

    // 2. High concentration in single short burst
    if (sessions.length === 1 && activeMinutes <= 15 && timed.length >= 300) {
      notableObservations.push({
        id: 'obs-concentrated',
        text: `Concentrated activity: Entire document drafted within a single ${activeMinutes}-minute session.`,
      });
    }

    return {
      firstDate: new Date(first * 1000),
      lastDate: new Date(last * 1000),
      sessionsCount: sessions.length,
      activeDaysCount: dayEntries.length,
      timeDisplay,
      dayEntries,
      maxDayCount,
      patternSummary,
      notableObservations,
    };
  }, [events]);

  // 2. Curated Milestone Timeline
  const timelineEntries = useMemo(() => {
    if (!events || !events.length) return [];

    const timed = events
      .filter((e) => Number.isFinite(Number(e?.occurred_at)))
      .slice()
      .sort((a, b) => Number(a.occurred_at) - Number(b.occurred_at));

    if (!timed.length) return [];

    const stepEvents = events
      .filter((e) => e?.steps && Array.isArray(e.steps) && e.steps.length > 0)
      .slice()
      .sort((a, b) => (Number(a.occurred_at) || 0) - (Number(b.occurred_at) || 0));

    const getStepIndexForTime = (targetTime) => {
      if (!stepEvents.length) return 0;
      let idx = 0;
      for (let i = 0; i < stepEvents.length; i++) {
        if (Number(stepEvents[i].occurred_at) <= targetTime) {
          idx = i;
        } else {
          break;
        }
      }
      return idx;
    };

    const entries = [];
    const firstEv = timed[0];
    const firstTime = Number(firstEv.occurred_at);
    const firstDate = new Date(firstTime * 1000);

    // 1. Milestone: Workspace opened
    entries.push({
      id: 'entry-open',
      stepIndex: 0,
      occurredAt: firstTime,
      timeStr: firstDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title: 'Workspace opened',
      detail: 'Initial session started',
      icon: FileText,
      iconColor: 'text-[#0047FF]',
      badge: 'Start',
    });

    let draftedBegan = false;
    let accumulatedDeletes = 0;
    let lastEventTime = firstTime;
    let lastRevisionStep = null;
    const resumptions = [];

    // Scan events to detect meaningful shifts
    for (let i = 0; i < timed.length; i++) {
      const ev = timed[i];
      const timeSec = Number(ev.occurred_at);
      const date = new Date(timeSec * 1000);
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const timeDiff = timeSec - lastEventTime;

      // First typing action -> Drafting began
      if (!draftedBegan && (ev.type === 'step' || ev.type === 'keystroke')) {
        draftedBegan = true;
        entries.push({
          id: `entry-draft-${i}`,
          stepIndex: getStepIndexForTime(timeSec),
          occurredAt: timeSec,
          timeStr,
          title: 'Drafting began',
          detail: 'Initial writing in document',
          icon: Edit3,
          iconColor: 'text-blue-600',
        });
        lastEventTime = timeSec;
        continue;
      }

      // Paste event -> Text inserted
      if (ev.type === 'paste') {
        const text = ev.data?.pasted_text || ev.data?.text || '';
        const len = text.length || ev.data?.pasted_text_length || ev.data?.length || 0;
        const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
        const preview = text.length > 50 ? text.slice(0, 50) + '…' : text;

        entries.push({
          id: `entry-paste-${i}`,
          stepIndex: getStepIndexForTime(timeSec),
          occurredAt: timeSec,
          timeStr,
          title: 'Text inserted',
          detail: `${len} characters${words ? ` (~${words} words)` : ''}${preview ? `: "${preview}"` : ''}`,
          icon: Clipboard,
          iconColor: 'text-amber-600',
          badge: 'Paste',
        });
        lastEventTime = timeSec;
        continue;
      }

      // Session resumption (> 3 min gap)
      if (timeDiff > 180 && draftedBegan) {
        resumptions.push({
          stepIndex: getStepIndexForTime(timeSec),
          occurredAt: timeSec,
          timeStr,
        });
        lastEventTime = timeSec;
      }

      // Revision & deletion
      if (ev.type === 'delete') {
        const delLen = Number(ev.data?.length) || 0;
        accumulatedDeletes += delLen;
        if (accumulatedDeletes >= 40) {
          lastRevisionStep = {
            stepIndex: getStepIndexForTime(timeSec),
            occurredAt: timeSec,
            timeStr,
          };
          accumulatedDeletes = 0;
        }
      }
    }

    // Group resumptions
    if (resumptions.length === 1) {
      entries.push({
        id: 'entry-resume-1',
        stepIndex: resumptions[0].stepIndex,
        occurredAt: resumptions[0].occurredAt,
        timeStr: resumptions[0].timeStr,
        title: 'Writing resumed',
        detail: 'Drafting continued in subsequent session',
        icon: Edit3,
        iconColor: 'text-indigo-600',
      });
    } else if (resumptions.length > 1) {
      const firstRes = resumptions[0];
      const lastRes = resumptions[resumptions.length - 1];
      entries.push({
        id: 'entry-resume-multi',
        stepIndex: firstRes.stepIndex,
        occurredAt: firstRes.occurredAt,
        timeStr: `${firstRes.timeStr} – ${lastRes.timeStr}`,
        title: 'Continued drafting',
        detail: `Work continued across ${resumptions.length} additional writing sessions`,
        icon: Edit3,
        iconColor: 'text-indigo-600',
      });
    }

    // Add revision milestone if notable edits took place
    if (lastRevisionStep) {
      entries.push({
        id: 'entry-revision',
        stepIndex: lastRevisionStep.stepIndex,
        occurredAt: lastRevisionStep.occurredAt,
        timeStr: lastRevisionStep.timeStr,
        title: 'Draft revised',
        detail: 'Document content edited and restructured',
        icon: Edit3,
        iconColor: 'text-gray-600',
      });
    }

    // Final Milestone: Submission sealed
    const lastEv = timed[timed.length - 1];
    const lastTime = Number(lastEv.occurred_at);
    const finalDate = new Date(lastTime * 1000);
    entries.push({
      id: 'entry-sealed',
      stepIndex: Math.max(0, stepEvents.length - 1),
      occurredAt: lastTime,
      timeStr: finalDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title: 'Submission sealed',
      detail: 'Document permanently recorded and locked',
      icon: Lock,
      iconColor: 'text-emerald-600',
      badge: 'Sealed',
    });

    entries.sort((a, b) => (a.occurredAt || 0) - (b.occurredAt || 0));
    return entries;
  }, [events]);

  if (!timelineEntries.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-xs">
        <Clock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <h3 className="text-xs font-bold text-gray-700">No Process Milestones</h3>
        <p className="text-[11px] text-gray-500 mt-1 font-sans">
          Detailed event timestamps are not available for this record.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Layer 2: Process Overview / Work Pattern ── */}
      {activityOverview && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0047FF]" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
                Work Pattern
              </h2>
            </div>
            <span className="text-[11px] font-mono text-gray-500">
              {activityOverview.timeDisplay} recorded
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-[#F9F8F6] p-2 rounded-xl border border-gray-200/80">
              <div className="text-[10px] text-gray-400 font-sans uppercase">Sessions</div>
              <div className="font-bold text-[#1A1A1B] mt-0.5">
                {activityOverview.sessionsCount} {activityOverview.sessionsCount === 1 ? 'session' : 'sessions'}
              </div>
            </div>
            <div className="bg-[#F9F8F6] p-2 rounded-xl border border-gray-200/80">
              <div className="text-[10px] text-gray-400 font-sans uppercase">Active Days</div>
              <div className="font-bold text-[#1A1A1B] mt-0.5">
                {activityOverview.activeDaysCount} {activityOverview.activeDaysCount === 1 ? 'day' : 'days'}
              </div>
            </div>
          </div>

          {/* Activity Over Time Bars */}
          {activityOverview.dayEntries.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                Activity Distribution
              </div>
              <div className="space-y-1.5 bg-[#F9F8F6] p-2.5 rounded-xl border border-gray-200">
                {activityOverview.dayEntries.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono">
                    <span className="w-14 text-[10px] text-gray-500 shrink-0 truncate">{d.day}</span>
                    <div className="flex-1 h-3.5 bg-gray-200/60 rounded overflow-hidden">
                      <div
                        className="h-full bg-[#0047FF] rounded"
                        style={{
                          width: `${Math.max(10, Math.round((d.count / activityOverview.maxDayCount) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-600 font-sans leading-snug">
                {activityOverview.patternSummary}
              </p>
            </div>
          )}

          {/* Observable Process Notes (No Accusations) */}
          {activityOverview.notableObservations.length > 0 && (
            <div className="pt-2 border-t border-gray-100 space-y-1.5">
              <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-gray-500" />
                <span>Process Observations</span>
              </div>
              {activityOverview.notableObservations.map((obs) => (
                <div
                  key={obs.id}
                  className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2 text-xs text-amber-900 leading-snug font-sans"
                >
                  {obs.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Layer 3: Chronological Event Timeline ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0047FF]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
              Process Timeline
            </h2>
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            {timelineEntries.length} milestone events
          </span>
        </div>

        <p className="text-xs text-gray-500 font-sans">
          Chronological development of the submission. Click any milestone to jump replay to that moment.
        </p>

        {/* Vertical Timeline */}
        <div className="relative pl-4 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
          {timelineEntries.map((entry, idx) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.id || idx}
                type="button"
                onClick={() => onSeekToEvent && onSeekToEvent(entry.stepIndex)}
                className="group relative flex items-start gap-3 w-full text-left transition-all cursor-pointer"
              >
                {/* Timeline marker */}
                <div className="absolute -left-4 mt-0.5 w-4 h-4 rounded-full bg-white border-2 border-gray-300 group-hover:border-[#0047FF] flex items-center justify-center transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 group-hover:bg-[#0047FF]" />
                </div>

                <div className="flex-1 min-w-0 bg-[#F9F8F6] group-hover:bg-blue-50/50 p-2.5 rounded-xl border border-gray-200 group-hover:border-blue-200 transition-all">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-gray-500">
                      {entry.timeStr}
                    </span>
                    {entry.badge && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600 uppercase">
                        {entry.badge}
                      </span>
                    )}
                  </div>

                  <div className="text-xs font-bold text-[#1A1A1B] mt-0.5 flex items-center gap-1.5">
                    <Icon className={`w-3.5 h-3.5 ${entry.iconColor} shrink-0`} />
                    <span className="truncate">{entry.title}</span>
                  </div>

                  {entry.detail && (
                    <p className="text-[11px] text-gray-600 mt-1 leading-snug font-sans break-words">
                      {entry.detail}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
