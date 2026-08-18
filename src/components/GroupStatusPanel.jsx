import { Users, CheckCircle2, Circle, Clock, Crown } from 'lucide-react';
import { STATUS_LABEL, statusSummary } from '../utils/groupStatus';

const STATUS_STYLE = {
  not_started: 'bg-gray-100 text-gray-600 border-gray-200',
  in_progress: 'bg-amber-50 text-amber-800 border-amber-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const STATUS_ICON = {
  not_started: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

export default function GroupStatusPanel({ group, currentUserId, onAction, busy = false, frozen = false }) {
  const summary = statusSummary(group?.members);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#0047FF]" />
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-gray-700">
            Members ({summary.total})
          </h3>
        </div>
        <span
          className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
            summary.allDone
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-100 text-gray-600 border-gray-200'
          }`}
        >
          {summary.doneCount}/{summary.total} Done
        </span>
      </div>

      <div className="space-y-2">
        {group?.members?.map((m) => {
          const mine = parseInt(m.student_id) === currentUserId;
          const status = m.status || 'not_started';
          const Icon = STATUS_ICON[status] || Circle;
          return (
            <div
              key={m.student_id}
              className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${
                mine ? 'bg-[#0047FF]/5 border-[#0047FF]/20' : 'bg-[#F9F8F6] border-gray-200'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-bold text-[#1A1A1B] truncate">
                    {m.student_name} {mine && <span className="text-gray-500 font-normal">(You)</span>}
                  </p>
                  {m.student_matric && (
                    <span className="text-[9px] font-mono font-bold text-gray-600 bg-white px-1 py-0.2 rounded border border-gray-200">
                      ID: {m.student_matric}
                    </span>
                  )}
                  {m.is_leader == 1 && (
                    <Crown className="w-3 h-3 text-amber-500 shrink-0" title="Leader" />
                  )}
                </div>
                <p className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border mt-1 font-medium ${STATUS_STYLE[status]}`}>
                  <Icon className="w-2.5 h-2.5" /> {STATUS_LABEL[status]}
                </p>
              </div>

              {mine && !frozen && (
                <div>
                  {status === 'done' ? (
                    <button
                      onClick={() => onAction('reopen')}
                      disabled={busy}
                      className="text-[11px] font-mono font-semibold px-2.5 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Reopen
                    </button>
                  ) : (
                    <button
                      onClick={() => onAction('done')}
                      disabled={busy}
                      className="text-[11px] font-mono font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      Mark Done
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-gray-500 leading-relaxed font-sans pt-1">
        Mark yourself Done when your writing is complete. Editing later will reopen your status automatically.
      </p>
    </div>
  );
}
