import { useEffect, useState } from 'react';
import { api } from '../api';
import { Users, Crown, Clock, CheckCircle2, Circle, Lock } from 'lucide-react';

const STATUS_META = {
  not_started: { label: 'Not started', icon: Circle, cls: 'text-gray-500 bg-gray-100 border-gray-200' },
  in_progress: { label: 'In progress', icon: Clock, cls: 'text-amber-800 bg-amber-50 border-amber-200' },
  done: { label: 'Done', icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

export default function GroupRoster({ assignmentId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`assignments/${assignmentId}/groups`)
      .then((d) => setGroups(d.groups || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (loading) {
    return (
      <div role="status" aria-label="Loading groups" className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="skeleton mb-3 h-5 w-1/3 rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
          </div>
        ))}
      </div>
    );
  }
  if (groups.length === 0) {
    return (
      <div className="text-xs text-gray-500 py-6 text-center bg-white rounded-xl border border-gray-200">
        No groups have formed yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-[#0047FF] shrink-0" />
              <h3 className="font-bold text-sm sm:text-base text-[#1A1A1B] truncate">
                {g.name || `Group ${g.invite_code}`}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono shrink-0">
              <span className="text-gray-500">
                Code: <strong className="text-[#0047FF] bg-[#0047FF]/5 px-2 py-0.5 rounded border border-[#0047FF]/15">{g.invite_code}</strong>
              </span>
              {g.frozen_at && (
                <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Sealed & Submitted
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {(g.members || []).map((m) => {
              const meta = STATUS_META[m.status] || STATUS_META.not_started;
              const Icon = meta.icon;
              return (
                <div
                  key={m.student_id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#F9F8F6] border border-gray-200 flex-wrap"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {m.is_leader == 1 && (
                      <Crown className="w-4 h-4 text-amber-500 shrink-0" title="Group Leader" />
                    )}
                    <span className="text-xs sm:text-sm font-semibold text-[#1A1A1B] truncate">
                      {m.student_name}
                    </span>
                    {m.student_matric && (
                      <span className="text-[10px] font-mono font-bold text-gray-700 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                        ID: {m.student_matric}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 font-mono truncate hidden sm:inline">
                      ({m.email})
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border font-semibold shrink-0 ${meta.cls}`}>
                    <Icon className="w-3 h-3" /> {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
