import { Users, CheckCircle2, Circle, Clock } from 'lucide-react';
import { STATUS_LABEL, statusSummary } from '../utils/groupStatus';

const STATUS_STYLE = {
  not_started: 'bg-gray-100 text-gray-500',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-green-100 text-green-700',
};

const STATUS_ICON = {
  not_started: Circle,
  in_progress: Clock,
  done: CheckCircle2,
};

// Members list with contribution statuses and the mark-Done/reopen actions.
// Statuses come from MySQL (via group.php); actions hit group_status.php.
export default function GroupStatusPanel({ group, currentUserId, onAction, busy = false, frozen = false }) {
  const summary = statusSummary(group?.members);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Members ({summary.total})</h3>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${summary.allDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {summary.doneCount}/{summary.total} complete
        </span>
      </div>

      <div className="space-y-2">
        {group?.members?.map((m) => {
          const mine = parseInt(m.student_id) === currentUserId;
          const status = m.status || 'not_started';
          const Icon = STATUS_ICON[status] || Circle;
          return (
            <div key={m.student_id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {m.student_name}
                  {m.is_leader == 1 && <span className="ml-1.5 text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">Leader</span>}
                </p>
                <p className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded mt-0.5 ${STATUS_STYLE[status]}`}>
                  <Icon className="w-3 h-3" /> {STATUS_LABEL[status]}
                </p>
              </div>
              {mine && !frozen && (
                status === 'done' ? (
                  <button onClick={() => onAction('reopen')} disabled={busy}
                    className="text-xs px-2 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                    Reopen
                  </button>
                ) : (
                  <button onClick={() => onAction('done')} disabled={busy}
                    className="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                    Mark Done
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        Mark yourself Done when your contribution is finished. Editing afterwards reopens you automatically.
      </p>
    </div>
  );
}
