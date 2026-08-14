import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { assignmentLink } from '../utils/links';
import { Plus, FileText, Users } from 'lucide-react';
import AssignmentForm from '../components/AssignmentForm';

const isGroup = (a) => a.is_group_work == 1 || a.is_group_work === true;

function TypeBadge({ group }) {
  if (group) {
    return (
      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 rounded-md px-1.5 py-0.5 text-xs font-medium leading-4">
        <Users className="w-3 h-3" aria-hidden="true" />
        Group
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md border border-gray-300 text-gray-600 px-1.5 py-0.5 text-xs font-medium leading-4">
      Individual
    </span>
  );
}

function Chip({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-gray-100 text-gray-600',
    ok: 'bg-green-50 text-green-700',
    warn: 'bg-amber-50 text-amber-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="grid gap-3" aria-hidden="true" role="status">
      <div className="sr-only">Loading assignments</div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-line bg-surface px-4 py-4">
          <div className="skeleton h-4 w-2/3 rounded" />
          <div className="skeleton mt-3 h-3 w-24 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('assignments')
      .then((d) => setAssignments(d.assignments || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;

  const isLecturer = user?.role === 'lecturer';
  const firstName = (user?.name || '').split(' ')[0] || 'there';

  const emptyState = isLecturer ? (
    <div>
      <p className="text-gray-500">No assignments yet — create one to get started</p>
    </div>
  ) : (
    <div>
      <p className="text-gray-500">No assignments yet</p>
      <p className="text-sm text-gray-400 mt-1">When your lecturer creates one, it will appear here.</p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {isLecturer ? (
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Submitted work and anything that needs your attention.</p>
          </div>
        ) : (
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-gray-900">Welcome, {firstName}</h1>
        )}
        {isLecturer && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 min-h-11 px-4 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Assignment
          </button>
        )}
      </div>

      {showForm && (
        <AssignmentForm
          onClose={() => setShowForm(false)}
          onCreated={(a) => { setAssignments((prev) => [a, ...prev]); setShowForm(false); }}
        />
      )}

      {assignments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          {emptyState}
        </div>
      ) : (
        <div className="grid gap-3">
          {assignments.map((a) => {
            const group = isGroup(a);
            const link = assignmentLink(a, user?.role);
            const due = a.due_date ? new Date(a.due_date).toLocaleDateString() : null;
            const groupCount = a.group_count ?? 0;
            const submittedGroups = a.submitted_group_count ?? 0;
            const flaggedGroups = a.flagged_group_count ?? 0;
            const submittedCount = a.submitted_count ?? 0;

            return (
              <Link
                key={a.id}
                to={link}
                className="block rounded-xl border border-line bg-surface px-4 py-3 min-h-12 flex items-center gap-3 hover:border-primary-300 hover:shadow-sm transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h2 className="min-w-0 font-medium text-gray-900 text-[15px] leading-snug truncate">{a.title}</h2>
                    <TypeBadge group={group} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    {isLecturer ? (
                      group ? (
                        <>
                          <Chip>{groupCount} group{groupCount === 1 ? '' : 's'} · {submittedGroups} submitted</Chip>
                          {flaggedGroups > 0 && (
                            <Chip tone="warn">{flaggedGroups} group{flaggedGroups === 1 ? '' : 's'} submitted with an incomplete member</Chip>
                          )}
                          {due && <span className="text-sm text-gray-500">{due}</span>}
                        </>
                      ) : (
                        <>
                          {due && <span className="text-sm text-gray-500">{due}</span>}
                          <Chip>{submittedCount} submitted</Chip>
                        </>
                      )
                    ) : (
                      <>
                        {due && <span className="text-sm text-gray-500">{due}</span>}
                        {group ? (
                          <Chip>Group work</Chip>
                        ) : a.submission_status === 'submitted' ? (
                          <Chip tone="ok">Submitted</Chip>
                        ) : a.submission_status === 'draft' ? (
                          <Chip>Draft</Chip>
                        ) : (
                          <Chip>Not started</Chip>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}