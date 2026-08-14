import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import SubmissionList from '../components/SubmissionList';
import GroupRoster from '../components/GroupRoster';
import { Clock, FileText, Edit3, Users } from 'lucide-react';

export default function Assignment() {
  const { id } = useParams();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`assignments/${id}`)
      .then(d => setAssignment(d.assignment))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div role="status" aria-label="Loading assignment">
        <div className="skeleton mb-4 h-7 w-1/3 rounded" />
        <div className="skeleton mb-8 h-4 w-2/3 rounded" />
        <div className="skeleton h-40 rounded-xl" />
      </div>
    );
  }
  if (!assignment) return <div className="text-center py-12 text-gray-500">Assignment not found.</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-gray-900">{assignment.title}</h1>
        {assignment.description && <p className="text-gray-500 mt-2">{assignment.description}</p>}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
          {assignment.due_date && <><Clock className="w-4 h-4" /> Due: {new Date(assignment.due_date).toLocaleString()}</>}
        </div>
      </div>

      {user?.role === 'lecturer' ? (
        <div>
          {assignment.is_group_work == 1 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" /> Groups & Members
              </h2>
              <GroupRoster assignmentId={assignment.id} />
            </div>
          )}
          <h2 className="text-lg font-semibold mb-4">Submissions ({assignment.submissions?.length || 0})</h2>
          <SubmissionList submissions={assignment.submissions} />
        </div>
      ) : (
        <div>
          {assignment.submissions?.length > 0 ? (
            <div className="rounded-xl border border-line bg-surface p-6">
              <SubmissionList submissions={assignment.submissions} />
            </div>
          ) : (
            <div className="text-center py-12 rounded-xl border border-line bg-surface">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Start working on this assignment</p>
              <Link to={`/submissions/${assignment.id}`}
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-700">
                <Edit3 className="w-4 h-4" /> Start Writing
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}