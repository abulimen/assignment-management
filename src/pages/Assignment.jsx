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
import { Clock, FileText, Edit3, Users, ArrowLeft, Copy, Check } from 'lucide-react';

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
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-2.5 w-2/3">
              <div className="flex gap-2">
                <div className="skeleton h-5 w-20 rounded" />
                <div className="skeleton h-5 w-16 rounded" />
              </div>
              <div className="skeleton h-7 w-3/4 rounded-md" />
              <div className="skeleton h-4 w-full rounded" />
            </div>
            <div className="skeleton h-8 w-28 rounded-lg" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 shadow-xs">
          <div className="skeleton h-5 w-32 rounded" />
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-5/6 rounded" />
        </div>
      </div>
    );
  }
  if (!assignment) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-xs max-w-xl mx-auto">
        <p className="text-gray-500 font-medium">Assignment not found or access restricted.</p>
        <Link to="/dashboard" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#0047FF]">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const isGroup = assignment.is_group_work == 1 || assignment.is_group_work === true;
  const isLecturer = user?.role === 'lecturer';
  const targetCourseLink = assignment.course_id ? courseLink(assignment.course_id) : '/dashboard';
  const courseLabel = assignment.course_code ? `← ${assignment.course_code}` : '← Back to Course';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={targetCourseLink}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0047FF] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{courseLabel}</span>
        </Link>

        {isLecturer && (
          <button
            onClick={() => setShowDuplicateModal(true)}
            className="w-full sm:w-auto justify-center px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-gray-500" />
            <span>Assign to another course</span>
          </button>
        )}
      </div>

      {/* Assignment Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {assignment.course_code && (
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200 uppercase">
                {assignment.course_code}
              </span>
            )}
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#0047FF] bg-[#0047FF]/5 px-2.5 py-1 rounded border border-[#0047FF]/20 uppercase">
              {isGroup ? 'GROUP ASSIGNMENT' : 'INDIVIDUAL ASSIGNMENT'}
            </span>
            {assignment.target_type === 'selected' && (
              <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                Selected Cohort
              </span>
            )}
          </div>

          {assignment.due_date && (
            <div className="flex items-center gap-1.5 font-mono text-xs text-gray-500 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
              <Clock className="w-3.5 h-3.5 text-[#0047FF]" />
              <span>Due: {new Date(assignment.due_date).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1B]">
            {assignment.title}
          </h1>
          {assignment.description && (
            <p className="text-gray-600 text-sm sm:text-base leading-relaxed mt-2 font-sans whitespace-pre-line">
              {assignment.description}
            </p>
          )}
        </div>
      </div>

      {isLecturer ? (
        <div className="space-y-8">
          {isGroup && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#1A1A1B] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0047FF]" />
                  <span>Groups & Members</span>
                </h2>
              </div>
              <GroupRoster assignmentId={assignment.id} />
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#1A1A1B] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0047FF]" />
              <span>Submissions ({assignment.submissions?.length || 0})</span>
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-5">
              <SubmissionList submissions={assignment.submissions} />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            const submittedList = assignment.submissions?.filter((s) => s.status === 'submitted') || [];
            const draftSub = assignment.submissions?.find((s) => s.status === 'draft');

            if (submittedList.length > 0) {
              return (
                <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-[#1A1A1B] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#0047FF]" />
                      <span>Your Submitted Work</span>
                    </h2>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                      Sealed & Submitted
                    </span>
                  </div>
                  <SubmissionList submissions={submittedList} />
                </div>
              );
            }

            if (draftSub) {
              return (
                <div className="bg-white rounded-xl border border-blue-200 bg-gradient-to-br from-white to-blue-50/30 p-6 sm:p-8 shadow-xs space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center font-bold">
                      <Edit3 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1A1A1B] text-base">Draft in Progress</h3>
                      <p className="text-xs text-gray-500 font-sans mt-0.5">
                        Your draft is saved and waiting in your connected workspace.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Link
                      to={`/submissions/${encodeId(assignment.id)}`}
                      className="inline-flex items-center gap-2 bg-[#0047FF] text-white px-6 py-2.5 rounded-lg text-xs font-bold hover:bg-[#0038CC] shadow-md shadow-blue-200 transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Continue Writing Draft</span>
                    </Link>
                  </div>
                </div>
              );
            }

            return (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#0047FF]/5 border border-[#0047FF]/15 text-[#0047FF] flex items-center justify-center mx-auto">
                  <Edit3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-[#1A1A1B] text-base">Ready to start writing?</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Your work, drafts, and revisions will be saved continuously inside your connected workspace.
                  </p>
                </div>
                <Link
                  to={`/submissions/${encodeId(assignment.id)}`}
                  className="inline-flex items-center gap-2 bg-[#0047FF] text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0038CC] shadow-md shadow-blue-200 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Start Writing</span>
                </Link>
              </div>
            );
          })()}
        </div>
      )}

      {/* Duplicate Assignment Modal */}
      {showDuplicateModal && (
        <DuplicateAssignmentModal
          assignment={assignment}
          onDuplicated={(newAssignment) => {
            setShowDuplicateModal(false);
            alert(`Assignment successfully assigned to course ID ${newAssignment.course_id}!`);
          }}
          onCancel={() => setShowDuplicateModal(false)}
        />
      )}
    </div>
  );
}