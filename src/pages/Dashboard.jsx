import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { Plus, FileText, Clock, CheckCircle, Users } from 'lucide-react';
import AssignmentForm from '../components/AssignmentForm';

export default function Dashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('assignments.php')
      .then(d => setAssignments(d.assignments))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {user?.role === 'lecturer' && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
            <Plus className="w-4 h-4" /> New Assignment
          </button>
        )}
      </div>

      {showForm && <AssignmentForm onClose={() => setShowForm(false)} onCreated={(a) => { setAssignments(prev => [a, ...prev]); setShowForm(false); }} />}

      {assignments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No assignments yet</p>
          {user?.role === 'lecturer' && <p className="text-sm text-gray-400 mt-1">Create one to get started</p>}
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map(a => {
            const isGroup = a.is_group_work == 1 || a.is_group_work === true;
            // Group assignments always go to group management page for students
            const link = isGroup
              ? `/group/${a.id}`
              : a.submission_id ? `/submissions/${a.id}` : `/assignments/${a.id}`;
            return (
              <Link key={a.id} to={link}
                className="block bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{a.title}</h3>
                    {a.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    {isGroup && <span className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium"><Users className="w-3 h-3" /> Group</span>}
                    {a.due_date && <><Clock className="w-4 h-4" /> {new Date(a.due_date).toLocaleDateString()}</>}
                  </div>
                </div>
                {a.submission_status && (
                  <div className="mt-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                      a.submission_status === 'submitted' ? 'bg-green-50 text-green-700' :
                      a.submission_status === 'draft' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      <CheckCircle className="w-3 h-3" />
                      {a.submission_status === 'submitted' ? 'Submitted' : 'Draft'}
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}