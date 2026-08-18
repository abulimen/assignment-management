import React, { useMemo } from 'react';
import {
  Clock,
  FileText,
  Edit3,
  Clipboard,
  CheckCircle2,
  Lock,
  PauseCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export default function ProcessTimeline({ events, onSeekToEvent, currentStepIndex = null }) {
  // Synthesize raw events into a human narrative timeline
  const timelineEntries = useMemo(() => {
    if (!events || !events.length) return [];

    // Filter and sort all timed events chronologically
    const timed = events
      .filter((e) => Number.isFinite(Number(e?.occurred_at)))
      .slice()
      .sort((a, b) => Number(a.occurred_at) - Number(b.occurred_at));

    if (!timed.length) return [];

    // Filter and sort all step events (matches replay scrubber 0..N-1)
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

    // 1. Initial Milestone: Workspace opened
    entries.push({
      id: 'entry-open',
      stepIndex: 0,
      occurredAt: firstTime,
      timeStr: firstDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title: 'Workspace opened',
      detail: 'Student opened the assignment workspace.',
      icon: FileText,
      iconColor: 'text-[#0047FF]',
      badge: 'Start',
      isBreak: false,
    });

    let writingBegan = false;
    let accumulatedDeletes = 0;
    let lastActiveTime = firstTime;
    const BREAK_THRESHOLD_SEC = 180; // 3 minutes of inactivity is a meaningful break

    for (let i = 0; i < timed.length; i++) {
      const ev = timed[i];
      const timeSec = Number(ev.occurred_at);
      const date = new Date(timeSec * 1000);
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const inactivity = timeSec - lastActiveTime;

      // Check if a meaningful break occurred before this event
      if (inactivity >= BREAK_THRESHOLD_SEC && writingBegan) {
        const breakMin = Math.round(inactivity / 60);
        let breakDurationStr = `${breakMin} minutes`;
        if (breakMin >= 1440) {
          const days = Math.floor(breakMin / 1440);
          const remHours = Math.round((breakMin % 1440) / 60);
          breakDurationStr = `${days} ${days === 1 ? 'day' : 'days'}${remHours > 0 ? ` ${remHours}h` : ''}`;
        } else if (breakMin >= 60) {
          const hrs = Math.floor(breakMin / 60);
          const mins = breakMin % 60;
          breakDurationStr = `${hrs}h${mins > 0 ? ` ${mins}m` : ''}`;
        }

        const breakStartDate = new Date(lastActiveTime * 1000);
        const breakStartTimeStr = breakStartDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        // Add Break Event
        entries.push({
          id: `entry-break-${i}`,
          stepIndex: getStepIndexForTime(lastActiveTime),
          occurredAt: lastActiveTime + 1,
          timeStr: breakStartTimeStr,
          title: `Break · ${breakDurationStr}`,
          detail: 'No writing activity was recorded during this period.',
          icon: PauseCircle,
          iconColor: 'text-gray-400',
          badge: 'Break',
          isBreak: true,
        });

        // Add Writing Resumed Event
        entries.push({
          id: `entry-resume-${i}`,
          stepIndex: getStepIndexForTime(timeSec),
          occurredAt: timeSec,
          timeStr,
          title: 'Writing resumed',
          detail: 'Student returned to the assignment and continued working.',
          icon: Edit3,
          iconColor: 'text-indigo-600',
          isBreak: false,
        });

        lastActiveTime = timeSec;
        accumulatedDeletes = 0;
      }

      // First typing action -> Writing began
      if (!writingBegan && (ev.type === 'step' || ev.type === 'keystroke')) {
        writingBegan = true;
        entries.push({
          id: `entry-start-writing-${i}`,
          stepIndex: getStepIndexForTime(timeSec),
          occurredAt: timeSec,
          timeStr,
          title: 'Writing began',
          detail: 'Student began entering text into the document.',
          icon: Edit3,
          iconColor: 'text-blue-600',
          isBreak: false,
        });
        lastActiveTime = timeSec;
        continue;
      }

      // Paste event -> Text inserted
      if (ev.type === 'paste') {
        const text = ev.data?.pasted_text || ev.data?.text || '';
        const len = text.length || ev.data?.pasted_text_length || ev.data?.length || 0;
        const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
        const preview = text.length > 60 ? text.slice(0, 60) + '…' : text;

        entries.push({
          id: `entry-paste-${i}`,
          stepIndex: getStepIndexForTime(timeSec),
          occurredAt: timeSec,
          timeStr,
          title: 'Text inserted',
          detail: `${len.toLocaleString()} characters${words ? ` (~${words} words)` : ''} entered through a paste event${preview ? `: "${preview}"` : ''}.`,
          icon: Clipboard,
          iconColor: 'text-amber-600',
          badge: 'Paste',
          isBreak: false,
        });
        lastActiveTime = timeSec;
        continue;
      }

      // Major revision / substantial deletion
      if (ev.type === 'delete') {
        const delLen = Number(ev.data?.length) || 0;
        accumulatedDeletes += delLen;
        if (accumulatedDeletes >= 50) {
          const approxWords = Math.round(accumulatedDeletes / 5.5);
          entries.push({
            id: `entry-revision-${i}`,
            stepIndex: getStepIndexForTime(timeSec),
            occurredAt: timeSec,
            timeStr,
            title: 'Major revision',
            detail: `Student substantially revised previously written content (~${approxWords} words removed or restructured).`,
            icon: RotateCcw,
            iconColor: 'text-purple-600',
            badge: 'Edit',
            isBreak: false,
          });
          accumulatedDeletes = 0;
          lastActiveTime = timeSec;
        }
      }

      if (ev.type === 'step' || ev.type === 'keystroke') {
        lastActiveTime = timeSec;
      }
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
      detail: 'Document permanently recorded and locked for evaluation.',
      icon: Lock,
      iconColor: 'text-emerald-600',
      badge: 'Sealed',
      isBreak: false,
    });

    entries.sort((a, b) => (a.occurredAt || 0) - (b.occurredAt || 0));
    return entries;
  }, [events]);

  if (!timelineEntries.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-xs">
        <Clock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
        <h3 className="text-xs font-bold text-gray-700">No Process Records</h3>
        <p className="text-[11px] text-gray-500 mt-1 font-sans">
          Detailed event timestamps are not available for this submission.
        </p>
      </div>
    );
  }

  const notableCount = timelineEntries.filter((e) => !e.isBreak).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#0047FF]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
            Process Timeline
          </h2>
        </div>
        <span className="text-[10px] font-mono text-gray-500 bg-[#F9F8F6] px-2 py-0.5 rounded border border-gray-200">
          {notableCount} notable events
        </span>
      </div>

      <p className="text-xs text-gray-500 font-sans leading-relaxed">
        A chronological record of how this assignment was developed. Click any event to jump replay to that moment.
      </p>

      {/* Vertical Timeline */}
      <div className="relative pl-4 space-y-2.5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
        {timelineEntries.map((entry, idx) => {
          const Icon = entry.icon;

          if (entry.isBreak) {
            return (
              <button
                key={entry.id || idx}
                type="button"
                onClick={() => onSeekToEvent && onSeekToEvent(entry.stepIndex)}
                className="group relative flex items-start gap-3 w-full text-left transition-all cursor-pointer py-1"
              >
                {/* Break Marker */}
                <div className="absolute -left-4 mt-1 w-4 h-4 rounded-full bg-gray-100 border-2 border-gray-300 group-hover:border-gray-500 flex items-center justify-center transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400 group-hover:bg-gray-700" />
                </div>

                <div className="flex-1 min-w-0 bg-gray-50 group-hover:bg-gray-100/80 px-3 py-2 rounded-xl border border-dashed border-gray-300 transition-all">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-gray-500">
                      {entry.timeStr}
                    </span>
                    <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-white border border-gray-200 text-gray-500 uppercase">
                      Inactivity
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-gray-600 mt-0.5 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{entry.title}</span>
                  </div>
                </div>
              </button>
            );
          }

          return (
            <button
              key={entry.id || idx}
              type="button"
              onClick={() => onSeekToEvent && onSeekToEvent(entry.stepIndex)}
              className="group relative flex items-start gap-3 w-full text-left transition-all cursor-pointer"
            >
              {/* Event Marker */}
              <div className="absolute -left-4 mt-1 w-4 h-4 rounded-full bg-white border-2 border-gray-300 group-hover:border-[#0047FF] flex items-center justify-center transition-colors">
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
  );
}
