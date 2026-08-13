import { useEffect, useState } from 'react';
import { api } from '../api';
import { Users, Crown, Clock, CheckCircle2, Circle } from 'lucide-react';

// Lecturer view of every group on an assignment: who registered, who leads,
// and each member's contribution status. Fetches GET /api/assignments/:id/groups.
const STATUS_META = {
  not_started: { label: 'Not started', icon: Circle, cls: 'text-gray-600' },
  in_progress: { label: 'In progress', icon: Clock, cls: 'text-amber-600' },
  done: { label: 'Done', icon: CheckCircle2, cls: 'text-green-700' },
};

export default function GroupRoster({ assignmentId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`assignments/${assignmentId}/groups`)
      .then(d => setGroups(d.groups || []))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (loading) return <div className="text-center py-6 text-gray-500">Loading groups...</div>;
  if (groups.length === 0) {
    return <div className="text-sm text-gray-600 py-4">No groups have formed yet.</div>;
  }

  return (
    <div className="space-y-4">
      {groups.map(g => (
        <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-primary-600 shrink-0" />
              <h3 className="font-semibold truncate">{g.name || `Group ${g.invite_code}`}</h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-600 shrink-0">
              <span>Code: <span className="font-mono font-medium text-gray-700">{g.invite_code}</span></span>
              {g.frozen_at && <span className="text-green-700 font-medium">Submitted</span>}
            </div>
          </div>
          <div className="space-y-1.5">
            {(g.members || []).map(m => {
              const meta = STATUS_META[m.status] || STATUS_META.not_started;
              const Icon = meta.icon;
              return (
                <div key={m.student_id} className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {m.is_leader == 1 && <Crown className="w-3.5 h-3.5 text-yellow-500 shrink-0" />}
                    <span className="text-sm min-w-0 truncate">{m.student_name}</span>
                    <span className="text-xs text-gray-600 truncate">{m.email}</span>
                  </div>
                  <span className={`flex items-center gap-1 text-xs shrink-0 ${meta.cls}`}>
                    <Icon className="w-3.5 h-3.5" /> {meta.label}
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
