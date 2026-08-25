import { Link } from 'react-router-dom';
import { Clock, CheckCircle2, Edit3, ChevronRight, Gauge } from 'lucide-react';
import { reviewLink } from '../utils/links';

export default function SubmissionList({ submissions }) {
  if (!submissions?.length) {
    return (
      <div className="text-center py-8 text-xs text-gray-500 font-sans">
        No student submissions recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((s) => (
        <Link
          key={s.id}
          to={reviewLink(s)}
          className="group block bg-[#F9F8F6] hover:bg-white border border-gray-200 hover:border-[#0047FF]/40 rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-xs transition-all cursor-pointer"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            {/* Left: Student Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                  s.status === 'submitted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {s.student_name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-sm text-[#1A1A1B] group-hover:text-[#0047FF] transition-colors truncate">
                    {s.group_name || s.student_name || 'Unknown Student'}
                  </p>
                  {s.group_name && (
                    <span className="text-[10px] font-mono font-bold text-[#0047FF] bg-[#0047FF]/5 px-1.5 py-0.5 rounded-md border border-[#0047FF]/20">
                      GROUP
                    </span>
                  )}
                  {!s.group_name && s.student_matric && (
                    <span className="text-[10px] font-mono font-bold text-gray-600 bg-white px-1.5 py-0.5 rounded-md border border-gray-200">
                      ID: {s.student_matric}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-mono truncate mt-0.5">
                  {s.group_name ? `Submitted by ${s.student_name}` : s.student_email}
                </p>
              </div>
            </div>

            {/* Right: Submission Metrics & Status */}
            <div className="flex items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-200/60">
              <div className="flex items-center gap-2">
                {s.avg_wpm > 0 && (
                  <span className="text-xs font-mono font-semibold text-gray-600 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                    {s.avg_wpm} WPM
                  </span>
                )}
                {s.total_time_ms > 0 && (
                  <span className="text-xs font-mono font-semibold text-gray-600 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-[#0047FF]" />
                    {Math.round(s.total_time_ms / 60000)}m
                  </span>
                )}
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-2xs ${
                    s.status === 'submitted'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : s.status === 'graded'
                      ? 'bg-[#0047FF]/5 text-[#0047FF] border-[#0047FF]/20'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {s.status === 'submitted' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Edit3 className="w-3.5 h-3.5" />
                  )}
                  <span className="capitalize">{s.status}</span>
                </span>
              </div>

              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#0047FF] group-hover:translate-x-0.5 transition-transform shrink-0" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
