import { Link } from 'react-router-dom';
import { Clock, CheckCircle, Edit3 } from 'lucide-react';

export default function SubmissionList({ submissions }) {
  if (!submissions?.length) {
    return <p className="text-sm text-gray-600 py-8 text-center">No submissions yet.</p>;
  }

  return (
    <div className="space-y-2">
      {submissions.map(s => (
        <Link key={s.id} to={`/review/${s.id}`}
          className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
              s.status === 'submitted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {s.student_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{s.student_name || 'Unknown'}</p>
              <p className="text-xs text-gray-600 truncate">{s.student_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-x-3 gap-y-1 shrink-0 flex-wrap justify-end">
            {s.avg_wpm > 0 && <span className="text-xs text-gray-600">{s.avg_wpm} WPM</span>}
            {s.total_time_ms > 0 && (
              <span className="text-xs text-gray-600 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {Math.round(s.total_time_ms / 60000)}m
              </span>
            )}
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              s.status === 'submitted' ? 'bg-green-50 text-green-700' :
              s.status === 'graded' ? 'bg-primary-50 text-primary-700' :
              'bg-yellow-50 text-yellow-700'
            }`}>
              <span className="flex items-center gap-1">
                {s.status === 'submitted' ? <CheckCircle className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                {s.status}
              </span>
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}