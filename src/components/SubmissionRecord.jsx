import React, { useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Highlighter,
  Clipboard,
  Shield,
  User,
  Activity,
} from 'lucide-react';

export default function SubmissionRecord({
  data,
  wordCount,
  onViewProcessRecord,
  highlightPasted,
  onToggleHighlights,
  isGroup = false,
}) {
  const events = data?.events || [];
  const stats = data?.stats || {};

  // Compute timing, sessions, and active days
  const workPattern = useMemo(() => {
    if (!events.length) {
      const activeMinutes = Math.round((stats.active_time_ms || stats.total_time_ms || 0) / 60000);
      const submittedAt = data?.submitted_at ? new Date(data.submitted_at) : null;
      return {
        activeMinutes,
        sessionsCount: 1,
        activeDaysCount: 1,
        firstDate: submittedAt,
        lastDate: submittedAt,
        submittedAt,
      };
    }

    const timed = events
      .filter((e) => Number.isFinite(Number(e?.occurred_at)))
      .slice()
      .sort((a, b) => Number(a.occurred_at) - Number(b.occurred_at));

    if (!timed.length) {
      const activeMinutes = Math.round((stats.active_time_ms || stats.total_time_ms || 0) / 60000);
      const submittedAt = data?.submitted_at ? new Date(data.submitted_at) : null;
      return {
        activeMinutes,
        sessionsCount: 1,
        activeDaysCount: 1,
        firstDate: submittedAt,
        lastDate: submittedAt,
        submittedAt,
      };
    }

    const GAP = 120; // 2 minutes gap constitutes a distinct session
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

    const activeSec = sessions.reduce((sum, s) => {
      const start = Number(s[0].occurred_at);
      const end = Number(s[s.length - 1].occurred_at);
      return sum + Math.max(end - start, 1);
    }, 0);

    const activeMinFromEvents = Math.max(Math.round(activeSec / 60), sessions.length > 0 ? 1 : 0);
    const fallbackActiveMin = Math.round((stats.active_time_ms || stats.total_time_ms || 0) / 60000);
    const activeMinutes = activeMinFromEvents > 0 ? activeMinFromEvents : fallbackActiveMin;

    const firstTime = Number(timed[0].occurred_at) * 1000;
    const lastTime = Number(timed[timed.length - 1].occurred_at) * 1000;
    const submittedAt = data?.submitted_at ? new Date(data.submitted_at) : (lastTime ? new Date(lastTime) : null);

    // Active days set
    const daySet = new Set(
      timed.map((e) => new Date(Number(e.occurred_at) * 1000).toDateString())
    );

    return {
      activeMinutes,
      sessionsCount: sessions.length,
      activeDaysCount: daySet.size,
      firstDate: new Date(firstTime),
      lastDate: new Date(lastTime),
      submittedAt,
    };
  }, [events, stats, data?.submitted_at]);

  // Compute paste events and character count
  const pasteInfo = useMemo(() => {
    let pasteEventsCount = 0;
    let pastedCharsCount = 0;

    for (const e of events) {
      if (e.type === 'paste') {
        pasteEventsCount++;
        const text = e.data?.pasted_text || e.data?.text || '';
        pastedCharsCount += text.length || e.data?.pasted_text_length || e.data?.length || 0;
      }
    }

    if (pasteEventsCount === 0 && stats.paste_count > 0) {
      pasteEventsCount = stats.paste_count;
    }

    return {
      pasteEventsCount,
      pastedCharsCount,
    };
  }, [events, stats]);

  // Process Milestones
  const milestones = useMemo(() => {
    const list = [];
    if (events.length > 0) {
      list.push({ label: 'Workspace opened', done: true });
      list.push({ label: 'Drafting began', done: true });

      if (pasteInfo.pasteEventsCount > 0) {
        list.push({
          label: `${pasteInfo.pastedCharsCount.toLocaleString()} characters entered via paste event`,
          done: true,
        });
      }

      const deleteCount = events.filter((e) => e.type === 'delete').length;
      if (deleteCount > 0) {
        list.push({ label: 'Document revised & edited', done: true });
      }
    } else {
      list.push({ label: 'Document created', done: true });
    }

    list.push({ label: 'Submission sealed', done: true });
    return list;
  }, [events, pasteInfo]);

  const activeTimeDisplay =
    workPattern.activeMinutes >= 60
      ? `${Math.floor(workPattern.activeMinutes / 60)}h ${workPattern.activeMinutes % 60}m`
      : `${workPattern.activeMinutes || 1}m`;

  const dateFormatted = workPattern.submittedAt
    ? workPattern.submittedAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Preserved record';

  return (
    <div className="space-y-4">
      {/* Author & Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-500">
              Submission Record
            </h2>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Sealed Snapshot
          </span>
        </div>

        <div>
          <div className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">Author</div>
          <div className="text-sm font-bold text-[#1A1A1B] mt-0.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <span>{data?.student_name || (isGroup ? 'Group Submission' : 'Individual Student')}</span>
          </div>
          {data?.student_matric && (
            <div className="text-xs font-mono text-gray-500 mt-0.5">ID: {data.student_matric}</div>
          )}
          <div className="text-[11px] text-gray-500 font-mono mt-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-gray-400" />
            <span>{dateFormatted}</span>
          </div>
        </div>

        {/* Factual Document Metrics */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
          <div className="bg-[#F9F8F6] p-2.5 rounded-xl border border-gray-200/80">
            <div className="text-base font-black font-mono text-[#1A1A1B]">
              {wordCount.toLocaleString()}
            </div>
            <div className="text-[10px] text-gray-500 font-sans mt-0.5">Words</div>
          </div>
          <div className="bg-[#F9F8F6] p-2.5 rounded-xl border border-gray-200/80">
            <div className="text-base font-black font-mono text-[#1A1A1B]">
              {activeTimeDisplay}
            </div>
            <div className="text-[10px] text-gray-500 font-sans mt-0.5">Recorded Time</div>
          </div>
          <div className="bg-[#F9F8F6] p-2.5 rounded-xl border border-gray-200/80">
            <div className="text-base font-black font-mono text-[#1A1A1B]">
              {workPattern.sessionsCount}
            </div>
            <div className="text-[10px] text-gray-500 font-sans mt-0.5">
              {workPattern.sessionsCount === 1 ? 'Work Period' : 'Work Periods'}
            </div>
          </div>
        </div>
      </div>

      {/* Composition / Text Insertion Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clipboard className="w-4 h-4 text-gray-500" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
              Text Insertion
            </h3>
          </div>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed font-sans">
          {pasteInfo.pastedCharsCount > 0
            ? `${pasteInfo.pastedCharsCount.toLocaleString()} characters entered through ${pasteInfo.pasteEventsCount === 1 ? 'a paste event' : `${pasteInfo.pasteEventsCount} paste events`}.`
            : 'All text was entered directly in the workspace.'}
        </p>

        {pasteInfo.pastedCharsCount > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onToggleHighlights}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                highlightPasted
                  ? 'bg-amber-50 text-amber-950 border-amber-300 ring-1 ring-amber-300/40'
                  : 'bg-[#F9F8F6] text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-700" />
              <span>
                {highlightPasted ? 'Highlights: Visible on Paper' : 'Highlight Inserted Text on Paper'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Observable Process Summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
          <Clock className="w-4 h-4 text-gray-500" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
            Process Summary
          </h3>
        </div>

        <ul className="space-y-2">
          {milestones.map((m, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{m.label}</span>
            </li>
          ))}
        </ul>

        {/* Primary CTA into Process Record */}
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onViewProcessRecord}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] shadow-xs transition-all cursor-pointer"
          >
            <span>View Process Record & Replay</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
