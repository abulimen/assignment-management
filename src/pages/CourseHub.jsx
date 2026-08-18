import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useMinLoading } from '../hooks/useMinLoading';
import { api } from '../api';
import AssignmentForm from '../components/AssignmentForm';
import CourseForm from '../components/CourseForm';
import DuplicateAssignmentModal from '../components/DuplicateAssignmentModal';
import InviteMemberModal from '../components/InviteMemberModal';
import DeleteCourseModal from '../components/DeleteCourseModal';
import UserAvatar from '../components/UserAvatar';
import { assignmentLink } from '../utils/links';
import {
  BookOpen,
  Users,
  FileText,
  Plus,
  Copy,
  Check,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Edit2,
  Trash2,
  Share2,
  ShieldAlert,
  GraduationCap,
  ArrowLeft,
  Circle,
  CheckCircle2,
  Search,
} from 'lucide-react';

const ITEMS_PER_PAGE = 6;

function PaginationControls({ currentPage, totalPages, onPageChange, label }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
      <span>
        Page {currentPage} of {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label={`Previous ${label} page`}
          className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-7 h-7 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
              p === currentPage
                ? 'bg-[#0047FF] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          aria-label={`Next ${label} page`}
          className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function CourseHub() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useMinLoading(loading, 280);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' | 'members'

  // Assignments filter, search, pagination
  const [assignSearch, setAssignSearch] = useState('');
  const [assignTypeFilter, setAssignTypeFilter] = useState('all');
  const [assignPage, setAssignPage] = useState(1);

  // Members search & pagination
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('all');
  const [memberPage, setMemberPage] = useState(1);

  // Modals
  const [showNewAssignment, setShowNewAssignment] = useState(false);
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showDeleteCourse, setShowDeleteCourse] = useState(false);
  const [duplicateTargetAssignment, setDuplicateTargetAssignment] = useState(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchCourseData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get(`courses/${id}`);
      setCourse(data.course);
      setAssignments(data.assignments || []);
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message || 'Failed to load course details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  const isLecturer = user?.role === 'lecturer' || course?.user_role === 'lecturer';

  function handleCopyCode() {
    if (!course?.invite_code) return;
    navigator.clipboard.writeText(course.invite_code);
    setCopiedCode(true);
    toast.success(`Copied course invite code: ${course.invite_code}`);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function handleCopyLink() {
    if (!course?.invite_code) return;
    const url = `${window.location.origin}/join/course/${course.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast.success('Course invite link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function handleDeleteAssignment(assignId, title) {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`assignments/${assignId}`);
      setAssignments((prev) => prev.filter((a) => a.id !== assignId));
      toast.success(`Deleted "${title}"`);
    } catch (err) {
      toast.error(err.message || 'Failed to delete assignment');
    }
  }

  async function handleRemoveMember(memberUserId, memberName) {
    if (!window.confirm(`Remove ${memberName} from this course?`)) return;
    try {
      await api.delete(`courses/${id}/members/${memberUserId}`);
      setMembers((prev) => prev.filter((m) => m.user_id !== memberUserId));
      toast.success(`Removed ${memberName} from course`);
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    }
  }

  // Filtered & Paginated Assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchSearch =
        (a.title || '').toLowerCase().includes(assignSearch.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(assignSearch.toLowerCase());
      if (!matchSearch) return false;

      const isGrp = Boolean(a.is_group_work);
      if (assignTypeFilter === 'individual') return !isGrp;
      if (assignTypeFilter === 'group') return isGrp;
      return true;
    });
  }, [assignments, assignSearch, assignTypeFilter]);

  const totalAssignPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE);
  const paginatedAssignments = useMemo(() => {
    const start = (assignPage - 1) * ITEMS_PER_PAGE;
    return filteredAssignments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAssignments, assignPage]);

  // Filtered & Paginated Members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        (m.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.student_id || '').toLowerCase().includes(memberSearch.toLowerCase());
      if (!matchSearch) return false;

      if (memberRoleFilter === 'lecturer') return m.role === 'lecturer';
      if (memberRoleFilter === 'student') return m.role === 'student';
      return true;
    });
  }, [members, memberSearch, memberRoleFilter]);

  const totalMemberPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = useMemo(() => {
    const start = (memberPage - 1) * ITEMS_PER_PAGE;
    return filteredMembers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredMembers, memberPage]);

  if (showSkeleton) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8" role="status" aria-label="Loading course">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex justify-between items-start">
            <div className="space-y-3 w-2/3">
              <div className="flex gap-2">
                <div className="skeleton h-6 w-20 rounded" />
                <div className="skeleton h-6 w-24 rounded" />
              </div>
              <div className="skeleton h-8 w-3/4 rounded-lg" />
              <div className="skeleton h-4 w-full rounded" />
            </div>
            <div className="skeleton h-9 w-32 rounded-lg" />
          </div>
          <div className="pt-4 border-t border-gray-100 flex gap-6">
            <div className="skeleton h-10 w-48 rounded-lg" />
            <div className="skeleton h-10 w-48 rounded-lg" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-gray-200 pb-2">
            <div className="skeleton h-6 w-32 rounded" />
            <div className="skeleton h-6 w-28 rounded" />
          </div>
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 shadow-xs">
                <div className="skeleton h-5 w-1/3 rounded" />
                <div className="skeleton h-4 w-1/4 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Unable to load course</h2>
        <p className="text-sm text-gray-600">{error || 'Course not found or access denied.'}</p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#0047FF] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  const students = members.filter((m) => m.role === 'student');
  const lecturers = members.filter((m) => m.role === 'lecturer');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Breadcrumb */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#0047FF] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>My Courses</span>
        </Link>
      </div>

      {/* Course Header Banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-[#0047FF]/10 text-[#0047FF] rounded-md border border-[#0047FF]/20 uppercase">
                {course.code}
              </span>
              {course.semester && (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                  {course.semester}
                </span>
              )}
              <span className="text-xs text-gray-400 font-sans">
                {course.organization_name || 'Draftly'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1A1B] tracking-tight">
              {course.title}
            </h1>

            {course.description && (
              <p className="text-sm text-gray-600 max-w-3xl leading-relaxed">
                {course.description}
              </p>
            )}
          </div>

          {/* Action Buttons for Lecturer */}
          {isLecturer && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={() => setShowEditCourse(true)}
                className="flex-1 sm:flex-none justify-center px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => setShowDeleteCourse(true)}
                title="Delete this course with password confirmation"
                className="flex-1 sm:flex-none justify-center px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
              <button
                onClick={() => setShowNewAssignment(true)}
                className="w-full sm:w-auto justify-center px-4 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-sm shadow-blue-200 transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Assignment</span>
              </button>
            </div>
          )}
        </div>

        {/* Course Meta & Invite Code Ribbon */}
        <div className="pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-gray-400" />
              <span>
                <strong>{lecturers.length}</strong> {lecturers.length === 1 ? 'Lecturer' : 'Lecturers'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-gray-400" />
              <span>
                <strong>{students.length}</strong> {students.length === 1 ? 'Student' : 'Students'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-gray-400" />
              <span>
                <strong>{assignments.length}</strong> {assignments.length === 1 ? 'Assignment' : 'Assignments'}
              </span>
            </div>
          </div>

          {/* Student Invite Code Box */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-[#F9F8F6] border border-gray-200/80 rounded-xl px-3.5 py-1.5 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-gray-500 uppercase tracking-wider font-semibold">
                Invite:
              </span>
              <code className="text-xs font-mono font-bold text-[#0047FF]">
                {course.invite_code}
              </code>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyCode}
                title="Copy code"
                className="p-1.5 text-gray-400 hover:text-[#1A1A1B] transition-colors rounded cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleCopyLink}
                title="Copy direct invite link"
                className="p-1.5 text-gray-400 hover:text-[#1A1A1B] transition-colors rounded cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-px">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'assignments'
              ? 'border-[#0047FF] text-[#0047FF]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Assignments ({assignments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'members'
              ? 'border-[#0047FF] text-[#0047FF]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Members & Roster ({members.length})</span>
        </button>
      </div>

      {/* TAB 1: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {assignments.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={assignSearch}
                  onChange={(e) => { setAssignSearch(e.target.value); setAssignPage(1); }}
                  placeholder="Filter coursework..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF]"
                />
              </div>

              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
                {['all', 'individual', 'group'].map((f) => (
                  <button
                    key={f}
                    onClick={() => { setAssignTypeFilter(f); setAssignPage(1); }}
                    className={`px-2.5 py-1 rounded-md transition-colors capitalize ${
                      assignTypeFilter === f ? 'bg-white shadow-xs text-[#1A1A1B] font-bold' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}

          {assignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-gray-900">No assignments created yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {isLecturer
                    ? `Create coursework for ${course.code}. Students will write, collaborate, and submit in Draftly.`
                    : 'Your lecturer has not posted any assignments in this course yet.'}
                </p>
              </div>
              {isLecturer && (
                <button
                  onClick={() => setShowNewAssignment(true)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-sm transition-all active:scale-[0.98] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Assignment</span>
                </button>
              )}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-xs text-gray-500">
              No assignments match your search or filter.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {paginatedAssignments.map((a) => {
                  const isGroup = Boolean(a.is_group_work);
                  const hasDue = Boolean(a.due_date);

                  return (
                    <div
                      key={a.id}
                      className="bg-white rounded-xl border border-gray-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                              isGroup
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-[#0047FF] border border-blue-200'
                            }`}
                          >
                            {isGroup ? 'Group Work' : 'Individual'}
                          </span>
                          {a.target_type === 'selected' && (
                            <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Targeted Cohort
                            </span>
                          )}
                          {hasDue && (
                            <span className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>Due {new Date(a.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </span>
                          )}
                        </div>

                        <div>
                          <h3 className="font-bold text-base text-[#1A1A1B]">{a.title}</h3>
                          {a.description && (
                            <p className="text-xs text-gray-600 line-clamp-1 mt-0.5 font-sans">
                              {a.description}
                            </p>
                          )}
                        </div>

                        {/* Lecturer stats or Student status */}
                        {isLecturer ? (
                          <div className="flex items-center gap-4 text-xs text-gray-500 font-sans">
                            {isGroup ? (
                              <>
                                <span><strong>{a.group_count || 0}</strong> groups</span>
                                <span>·</span>
                                <span><strong>{a.submitted_group_count || 0}</strong> submitted</span>
                                {a.flagged_group_count > 0 && (
                                  <span className="text-amber-600 font-semibold">({a.flagged_group_count} override)</span>
                                )}
                              </>
                            ) : (
                              <span><strong>{a.submitted_count || 0}</strong> submissions</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                            {a.submission_status === 'submitted' ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Submitted</span>
                              </span>
                            ) : a.submission_status === 'draft' ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <Clock className="w-3 h-3" />
                                <span>Draft in progress</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                <Circle className="w-3 h-3 text-gray-400" />
                                <span>Not started</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        {isLecturer ? (
                          <>
                            <button
                              onClick={() => setDuplicateTargetAssignment(a)}
                              title="Assign to another course"
                              className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-[#0047FF] bg-gray-100 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <span>Duplicate</span>
                            </button>
                            <Link
                              to={assignmentLink(a, 'lecturer')}
                              className="px-4 py-1.5 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-xs transition-all active:scale-[0.98] inline-flex items-center gap-1"
                            >
                              <span>Submissions</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDeleteAssignment(a.id, a.title)}
                              title="Delete assignment"
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <Link
                            to={assignmentLink(a, 'student')}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-xs transition-all active:scale-[0.98] inline-flex items-center gap-1"
                          >
                            <span>{a.submission_status === 'submitted' ? 'View Work' : 'Open Workspace'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <PaginationControls
                currentPage={assignPage}
                totalPages={totalAssignPages}
                onPageChange={setAssignPage}
                label="assignments"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEMBERS & ROSTER */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0047FF]" />
                <h3 className="font-bold text-base text-[#1A1A1B]">Course Members ({members.length})</h3>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => { setMemberSearch(e.target.value); setMemberPage(1); }}
                    placeholder="Search members..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={memberRoleFilter}
                    onChange={(e) => { setMemberRoleFilter(e.target.value); setMemberPage(1); }}
                    className="flex-1 sm:flex-none px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 font-medium"
                  >
                    <option value="all">All Roles</option>
                    <option value="lecturer">Lecturers</option>
                    <option value="student">Students</option>
                  </select>

                  {isLecturer && (
                    <button
                      onClick={() => setShowInviteMember(true)}
                      className="flex-1 sm:flex-none justify-center px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Add Member</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {filteredMembers.length === 0 ? (
              <div className="py-8 text-center space-y-2 text-xs text-gray-500">
                No members found matching your search.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="divide-y divide-gray-100">
                  {paginatedMembers.map((m) => {
                    const isLec = m.role === 'lecturer';
                    return (
                      <div key={m.user_id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            user={{ email: m.email, name: m.name, id: m.user_id }}
                            size={32}
                            className="shadow-2xs"
                          />
                          <div>
                            <div className="font-semibold text-sm text-[#1A1A1B] flex items-center gap-2">
                              <span>{m.name}</span>
                              {m.student_id && (
                                <span className="text-[10px] font-mono font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                  ID: {m.student_id}
                                </span>
                              )}
                              <span className={`text-[10px] font-mono px-2 py-0.2 rounded font-semibold ${
                                isLec ? 'bg-gray-100 text-gray-700' : 'bg-blue-50 text-[#0047FF]'
                              }`}>
                                {isLec ? 'Lecturer' : 'Student'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">{m.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-gray-400 font-mono">
                            Joined {new Date(m.joined_at).toLocaleDateString()}
                          </span>
                          {isLecturer && m.role === 'student' && (
                            <button
                              onClick={() => handleRemoveMember(m.user_id, m.name)}
                              className="text-gray-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                              title="Remove student from course"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <PaginationControls
                  currentPage={memberPage}
                  totalPages={totalMemberPages}
                  onPageChange={setMemberPage}
                  label="members"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showNewAssignment && (
        <AssignmentForm
          initialCourseId={id}
          onClose={() => setShowNewAssignment(false)}
          onCreated={(newAssignment) => {
            setShowNewAssignment(false);
            setAssignments((prev) => [newAssignment, ...prev]);
          }}
        />
      )}

      {showEditCourse && (
        <CourseForm
          course={course}
          onSave={(updated) => {
            setShowEditCourse(false);
            setCourse((prev) => ({ ...prev, ...updated }));
          }}
          onCancel={() => setShowEditCourse(false)}
        />
      )}

      {showDeleteCourse && (
        <DeleteCourseModal
          course={course}
          onDeleted={() => {
            setShowDeleteCourse(false);
            navigate('/dashboard', { replace: true });
          }}
          onCancel={() => setShowDeleteCourse(false)}
        />
      )}

      {showInviteMember && (
        <InviteMemberModal
          courseId={id}
          onMemberAdded={(newMember) => {
            setShowInviteMember(false);
            setMembers((prev) => [...prev, { ...newMember, joined_at: new Date().toISOString() }]);
          }}
          onCancel={() => setShowInviteMember(false)}
        />
      )}

      {duplicateTargetAssignment && (
        <DuplicateAssignmentModal
          assignment={duplicateTargetAssignment}
          onDuplicated={(newAssignment) => {
            setDuplicateTargetAssignment(null);
            alert(`Assignment successfully duplicated to course ID ${newAssignment.course_id}!`);
          }}
          onCancel={() => setDuplicateTargetAssignment(null)}
        />
      )}
    </div>
  );
}
