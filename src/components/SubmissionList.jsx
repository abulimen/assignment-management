import { Link } from 'react-router-dom';
import { Clock, CheckCircle, Edit3, ArrowRight, User } from 'lucide-react';
import { reviewLink } from '../utils/links';

export default function SubmissionList({ submissions }) {
  if (!submissions?.length) {
    return <p className="text-xs text-gray-500 py-6 text-center font-sans">No submissions yet.</p>;
  }

  return (
    <div className="space-y-2.5">
      {submissions.map((s) => (
        <Link
          key={s.id}
          to={reviewLink(s)}
          className="group flex items-center justify-between gap-3 bg-[#F9F8F6] border border-gray-200 rounded-lg p-3.5 hover:border-[#0047FF]/40 hover:bg-white hover:shadow-xs transition-all"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                s.status === 'submitted'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {s.student_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-[#1A1A1B] group-hover:text-[#0047FF] transition-colors truncate">
                  {s.student_name || 'Unknown'}
                </p>
                {s.student_matric && (
                  <span className="text-[10px] font-mono font-bold text-gray-600 bg-white px-1.5 py-0.2 rounded border border-gray-200">
                    ID: {s.student_matric}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-mono truncate">{s.student_email}</p>
            </div>
          </div>

          <div className="flex items-center gap-x-3 gap-y-1 shrink-0 flex-wrap justify-end">
            {s.avg_wpm > 0 && (
              <span className="text-xs font-mono text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                {s.avg_wpm} WPM
              </span>
            )}
            {s.total_time_ms > 0 && (
              <span className="text-xs font-mono text-gray-500 flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-gray-200">
                <Clock className="w-3 h-3 text-[#0047FF]" /> {Math.round(s.total_time_ms / 60000)}m
              </span>
            )}
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
                s.status === 'submitted'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : s.status === 'graded'
                  ? 'bg-[#0047FF]/5 text-[#0047FF] border-[#0047FF]/20'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span className="flex items-center gap-1">
                {s.status === 'submitted' ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <Edit3 className="w-3 h-3" />
                )}
                <span className="capitalize">{s.status}</span>
              </span>
            </span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#0047FF] group-hover:translate-x-0.5 transition-all hidden sm:inline" />
          </div>
        </Link>
      ))}
    </div>
  );
}