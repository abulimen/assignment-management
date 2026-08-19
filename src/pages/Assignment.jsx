import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMinLoading } from '../hooks/useMinLoading';
import { api } from '../api';
import SubmissionList from '../components/SubmissionList';
import GroupRoster from '../components/GroupRoster';
import DuplicateAssignmentModal from '../components/DuplicateAssignmentModal';
import { courseLink } from '../utils/links';
import { encodeId } from '../utils/id';
import { Clock, FileText, Edit3, Users, ArrowLeft, Copy, Calendar, ShieldCheck } from 'lucide-react';

export default function Assignment() {
  const { id } = useParams();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useMinLoading(loading, 280);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  useEffect(() => {
    api.get(`assignments/${id}`)
      .then((d) => setAssignment(d.assignment))
      .finally(() => setLoading(false));
  }, [id]);

  if (showSkeleton) {
    return (
      <div role="status" aria-label="Loading assignment" className="max-w-5xl mx-auto space-y-6">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <div className="skeleton h-5 w-20 rounded" />
              <div className="skeleton h-5 w-16 rounded" />
            </div>
            <div className="skeleton h-7 w-3/4 rounded-md" />
            <div className="skeleton h-4 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }
  if (!assignment) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-xs max-w-xl mx-auto">
        <p className="text-gray-500 font-medium text-xs">Assignment not found or access restricted.</p>
        <Link to="/dashboard" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#0047FF]">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const isGroup = assignment.is_group_work == 1 || assignment.is_group_work === true;
  const isLecturer = user?.role === 'lecturer';
  const targetCourseLink = assignment.course_id ? courseLink(assignment.course_id) : '/dashboard';
  const courseLabel = assignment.course_code ? `${assignment.course_code}` : 'Course Workspace';

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Header / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          to={targetCourseLink}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0047FF] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to {courseLabel}</span>
        </Link>

        {isLecturer && (
          <button
            onClick={() => setShowDuplicateModal(true)}
            className="self-start sm:self-auto px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-gray-500" />
            <span>Assign to another course</span>
          </button>
        )}
      </div>

      {/* Assignment Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {assignment.course_code && (
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md border border-gray-200 uppercase">
                {assignment.course_code}
              </span>
            )}
            <span className={`text-[10px] font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-md uppercase border ${
              isGroup
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-blue-50 text-[#0047FF] border-blue-200'
            }`}>
              {isGroup ? 'Group Work' : 'Individual Work'}
            </span>
          </div>

          {assignment.due_date && (
            <div className="flex items-center gap-1.5 font-mono text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
              <Calendar className="w-3.5 h-3.5 text-[#0047FF]" />
              <span>Due: {new Date(assignment.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1A1B]">
            {assignment.title}
          </h1>
          {assignment.description && (
            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed mt-2 font-sans whitespace-pre-line">
              {assignment.description}
            </p>
          )}
        </div>
      </div>

      {/* Content Section */}
      {isLecturer ? (
        <div className="space-y-6">
          {isGroup && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#1A1A1B] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0047FF]" />
                  <span>Groups & Members</span>
                </h2>
              </div>
              <GroupRoster assignmentId={assignment.id} />
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#1A1A1B] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0047FF]" />
              <span>Submissions ({assignment.submissions?.length || 0})</span>
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-5">
              <SubmissionList submissions={assignment.submissions} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 text-center space-y-4">
          <FileText className="w-10 h-10 text-[#0047FF] mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900">Ready to write?</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Launch your tracked writing workspace to draft and submit your work.
            </p>
          </div>
          <div>
            <Link
              to={`/submissions/${assignment.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-xl shadow-xs transition-all active:scale-[0.98]"
            >
              <span>Open Document Workspace</span>
            </Link>
          </div>
        </div>
      )}

      {showDuplicateModal && (
        <DuplicateAssignmentModal
          assignment={assignment}
          currentCourseId={assignment.course_id}
          onClose={() => setShowDuplicateModal(false)}
          onSuccess={() => {
            setShowDuplicateModal(false);
          }}
        />
      )}
    </div>
  );
}
