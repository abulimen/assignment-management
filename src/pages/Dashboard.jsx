import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { api } from '../api';
import { assignmentLink, courseLink } from '../utils/links';
import {
  Plus,
  FileText,
  Users,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  Circle,
  KeyRound,
  Search,
  Trash2,
  Filter,
  Copy,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import AssignmentForm from '../components/AssignmentForm';
import CourseForm from '../components/CourseForm';
import JoinCourseModal from '../components/JoinCourseModal';
import DeleteCourseModal from '../components/DeleteCourseModal';

const isGroup = (a) => a.is_group_work == 1 || a.is_group_work === true;

const COURSES_PER_PAGE = 6;
const ASSIGNMENTS_PER_PAGE = 6;

function TypeBadge({ group }) {
  if (group) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-[#0047FF]/5 text-[#0047FF] border border-[#0047FF]/20 rounded-md px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider">
        <Users className="w-3 h-3" aria-hidden="true" />
        Group
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 text-gray-700 px-2 py-0.5 text-xs font-mono font-bold uppercase tracking-wider">
      <FileText className="w-3 h-3 text-gray-400" />
      Individual
    </span>
  );
}

function Chip({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-800 border-amber-200',
    cobalt: 'bg-[#0047FF]/5 text-[#0047FF] border-[#0047FF]/20',
  };
  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

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

import { useMinLoading } from '../hooks/useMinLoading';

function Skeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10" aria-hidden="true" role="status">
      <div className="sr-only">Loading dashboard</div>
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="skeleton h-8 w-48 rounded-lg" />
          <div className="skeleton h-4 w-72 rounded" />
        </div>
        <div className="skeleton h-10 w-36 rounded-lg shrink-0" />
      </div>

      {/* Courses Section Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="skeleton h-6 w-32 rounded" />
          <div className="skeleton h-8 w-48 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-xs">
              <div className="flex justify-between items-center">
                <div className="skeleton h-5 w-16 rounded" />
                <div className="skeleton h-4 w-20 rounded" />
              </div>
              <div className="space-y-2">
                <div className="skeleton h-5 w-3/4 rounded" />
                <div className="skeleton h-3.5 w-full rounded" />
              </div>
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <div className="skeleton h-3.5 w-24 rounded" />
                <div className="skeleton h-4 w-4 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assignments Section Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="skeleton h-6 w-44 rounded" />
          <div className="skeleton h-8 w-64 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="skeleton h-4 w-14 rounded" />
                <div className="skeleton h-4 w-16 rounded" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
              <div className="skeleton h-5 w-1/2 rounded" />
              <div className="skeleton h-6 w-36 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [deleteTargetCourse, setDeleteTargetCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const showSkeleton = useMinLoading(loading, 280);
  const [copiedCourseId, setCopiedCourseId] = useState(null);

  // Courses Search, Filter, Pagination
  const [courseSearch, setCourseSearch] = useState('');
  const [courseSemesterFilter, setCourseSemesterFilter] = useState('all');
  const [coursePage, setCoursePage] = useState(1);

  // Assignments Search, Filter, Pagination
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [assignmentCourseFilter, setAssignmentCourseFilter] = useState('all');
  const [assignmentTypeFilter, setAssignmentTypeFilter] = useState('all');
  const [assignmentPage, setAssignmentPage] = useState(1);

  useEffect(() => {
    Promise.all([
      api.get('courses').catch(() => ({ courses: [] })),
      api.get('assignments').catch(() => ({ assignments: [] })),
    ])
      .then(([courseData, assignData]) => {
        setCourses(courseData?.courses || []);
        setAssignments(assignData?.assignments || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const isLecturer = user?.role === 'lecturer';
  const firstName = (user?.name || '').split(' ')[0] || 'there';

  function handleCopyInviteCode(e, c) {
    e.preventDefault();
    e.stopPropagation();
    if (!c.invite_code) return;
    navigator.clipboard.writeText(c.invite_code);
    setCopiedCourseId(c.id);
    toast.success(`Copied invite code for ${c.code}: ${c.invite_code}`);
    setTimeout(() => setCopiedCourseId(null), 2000);
  }

  // Distinct semesters for course filter dropdown
  const availableSemesters = useMemo(() => {
    const s = new Set();
    for (const c of courses) {
      if (c.semester) s.add(c.semester);
    }
    return Array.from(s);
  }, [courses]);

  // Filtered Courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchSearch =
        (c.code || '').toLowerCase().includes(courseSearch.toLowerCase()) ||
        (c.title || '').toLowerCase().includes(courseSearch.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(courseSearch.toLowerCase()) ||
        (c.semester || '').toLowerCase().includes(courseSearch.toLowerCase());
      if (!matchSearch) return false;
      if (courseSemesterFilter !== 'all' && c.semester !== courseSemesterFilter) return false;
      return true;
    });
  }, [courses, courseSearch, courseSemesterFilter]);

  const totalCoursePages = Math.ceil(filteredCourses.length / COURSES_PER_PAGE);
  const paginatedCourses = useMemo(() => {
    const start = (coursePage - 1) * COURSES_PER_PAGE;
    return filteredCourses.slice(start, start + COURSES_PER_PAGE);
  }, [filteredCourses, coursePage]);

  // Filtered Assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      const matchSearch =
        (a.title || '').toLowerCase().includes(assignmentSearch.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(assignmentSearch.toLowerCase()) ||
        (a.course_code || '').toLowerCase().includes(assignmentSearch.toLowerCase());
      if (!matchSearch) return false;

      if (assignmentCourseFilter !== 'all' && String(a.course_id) !== String(assignmentCourseFilter)) {
        return false;
      }

      if (assignmentTypeFilter === 'individual') return !isGroup(a);
      if (assignmentTypeFilter === 'group') return isGroup(a);
      if (assignmentTypeFilter === 'submitted') return a.submission_status === 'submitted';
      if (assignmentTypeFilter === 'draft') return a.submission_status === 'draft';
      return true;
    });
  }, [assignments, assignmentSearch, assignmentCourseFilter, assignmentTypeFilter]);

  const totalAssignmentPages = Math.ceil(filteredAssignments.length / ASSIGNMENTS_PER_PAGE);
  const paginatedAssignments = useMemo(() => {
    const start = (assignmentPage - 1) * ASSIGNMENTS_PER_PAGE;
    return filteredAssignments.slice(start, start + ASSIGNMENTS_PER_PAGE);
  }, [filteredAssignments, assignmentPage]);

  if (showSkeleton) return <Skeleton />;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      
      {/* Header Bar */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1A1B]">
            {isLecturer ? 'Dashboard' : `Welcome, ${firstName}`}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 font-sans">
            {isLecturer
              ? 'Submitted work and anything that needs your attention.'
              : 'Here is the coursework across your enrolled courses.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
          {isLecturer ? (
            <>
              <button
                onClick={() => setShowCourseForm(true)}
                className="flex-1 sm:flex-none justify-center px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5 text-gray-500" />
                <span>New Course</span>
              </button>
              <button
                onClick={() => {
                  if (courses.length === 0) {
                    setShowCourseForm(true);
                  } else {
                    setShowAssignmentForm(true);
                  }
                }}
                className="flex-1 sm:flex-none justify-center min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-sm shadow-blue-200 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Assignment</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowJoinModal(true)}
              className="w-full sm:w-auto justify-center min-h-[44px] px-4 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-sm shadow-blue-200 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
            >
              <KeyRound className="w-4 h-4" />
              <span>Join Course</span>
            </button>
          )}
        </div>
      </header>

      {/* -------------------------------------------------------- SECTION: MY COURSES */}
      <section aria-labelledby="my-courses-heading" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#0047FF]" />
            <h2 id="my-courses-heading" className="text-lg font-bold text-[#1A1A1B]">
              My Courses
            </h2>
            <span className="text-xs font-mono text-gray-400 font-medium">
              ({courses.length})
            </span>
          </div>

          {/* Course Search & Filter */}
          {courses.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => { setCourseSearch(e.target.value); setCoursePage(1); }}
                  placeholder="Search courses..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF]"
                />
                {courseSearch && (
                  <button
                    onClick={() => { setCourseSearch(''); setCoursePage(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                    aria-label="Clear course search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {availableSemesters.length > 0 && (
                <select
                  value={courseSemesterFilter}
                  onChange={(e) => { setCourseSemesterFilter(e.target.value); setCoursePage(1); }}
                  className="px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 font-medium"
                >
                  <option value="all">All Terms</option>
                  {availableSemesters.map((sem) => (
                    <option key={sem} value={sem}>{sem}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center space-y-3">
            <div className="w-10 h-10 rounded-lg bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center mx-auto">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900">
                {isLecturer ? 'Create your first course' : "You haven't joined a course yet"}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {isLecturer
                  ? 'Set up a course (e.g. SWE 201) to invite students and organize coursework.'
                  : 'Ask your lecturer for their course invite code to join your class workspace.'}
              </p>
            </div>
            <div>
              {isLecturer ? (
                <button
                  onClick={() => setShowCourseForm(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-xs transition-all cursor-pointer"
                >
                  Create Course
                </button>
              ) : (
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Enter Invite Code</span>
                </button>
              )}
            </div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-xs text-gray-500">
            No courses match your search or filter.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedCourses.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:shadow-md hover:border-[#0047FF]/40 transition-all flex flex-col justify-between group relative"
                >
                  <Link to={courseLink(c)} className="space-y-3 block flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2.5 py-0.5 bg-[#0047FF]/10 text-[#0047FF] rounded border border-[#0047FF]/20 uppercase">
                          {c.code}
                        </span>
                        {c.invite_code && (
                          <button
                            type="button"
                            onClick={(e) => handleCopyInviteCode(e, c)}
                            title={`Copy invite code: ${c.invite_code}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-[#0047FF] px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                          >
                            {copiedCourseId === c.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span className="hidden sm:inline">{c.invite_code}</span>
                          </button>
                        )}
                      </div>
                      {c.semester && (
                        <span className="text-[11px] font-sans text-gray-400 truncate max-w-[120px]">
                          {c.semester}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-base text-[#1A1A1B] group-hover:text-[#0047FF] transition-colors line-clamp-1">
                        {c.title}
                      </h3>
                      {c.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1 font-sans">
                          {c.description}
                        </p>
                      )}
                    </div>
                  </Link>

                  <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-sans">
                    {isLecturer ? (
                      <div className="flex items-center gap-2.5">
                        <span><strong>{c.student_count || 0}</strong> students</span>
                        <span>·</span>
                        <span><strong>{c.assignment_count || 0}</strong> assignments</span>
                      </div>
                    ) : (
                      <div>
                        {c.pending_assignment_count > 0 ? (
                          <span className="text-[#0047FF] font-semibold">
                            {c.pending_assignment_count} pending {c.pending_assignment_count === 1 ? 'assignment' : 'assignments'}
                          </span>
                        ) : (
                          <span className="text-gray-400">All coursework completed</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      {isLecturer && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteTargetCourse(c);
                          }}
                          title="Delete course"
                          className="p-1 text-gray-300 hover:text-red-600 transition-colors rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <Link to={courseLink(c)} className="text-[#0047FF] group-hover:translate-x-0.5 transition-transform p-1">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <PaginationControls
              currentPage={coursePage}
              totalPages={totalCoursePages}
              onPageChange={setCoursePage}
              label="courses"
            />
          </div>
        )}
      </section>

      {/* -------------------------------------------------------- SECTION: ACTIVE ASSIGNMENTS */}
      <section aria-labelledby="assignments-heading" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0047FF]" />
            <h2 id="assignments-heading" className="text-lg font-bold text-[#1A1A1B]">
              {isLecturer ? 'Coursework & Submissions' : 'My Assignments'}
            </h2>
            <span className="text-xs font-mono text-gray-400 font-medium">
              ({assignments.length})
            </span>
          </div>

          {/* Search, Course Filter, & Type Filters */}
          {assignments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={assignmentSearch}
                  onChange={(e) => { setAssignmentSearch(e.target.value); setAssignmentPage(1); }}
                  placeholder="Filter assignments..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 focus:border-[#0047FF]"
                />
                {assignmentSearch && (
                  <button
                    onClick={() => { setAssignmentSearch(''); setAssignmentPage(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                    aria-label="Clear assignment search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {courses.length > 1 && (
                <select
                  value={assignmentCourseFilter}
                  onChange={(e) => { setAssignmentCourseFilter(e.target.value); setAssignmentPage(1); }}
                  className="flex-1 sm:flex-none px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/20 font-medium"
                >
                  <option value="all">All Courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.code}</option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-medium overflow-x-auto max-w-full">
                {['all', 'individual', 'group', ...(isLecturer ? [] : ['submitted', 'draft'])].map((f) => (
                  <button
                    key={f}
                    onClick={() => { setAssignmentTypeFilter(f); setAssignmentPage(1); }}
                    className={`px-2.5 py-1 rounded-md transition-colors capitalize shrink-0 ${
                      assignmentTypeFilter === f ? 'bg-white shadow-xs text-[#1A1A1B] font-bold' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assignments Grid */}
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-1">
            <h3 className="text-sm font-bold text-gray-900">
              {isLecturer ? 'No assignments yet — create one to get started.' : 'No assignments yet'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {isLecturer
                ? 'Create assignments inside your courses to begin collecting verified student work.'
                : 'When your lecturer creates one, it will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {paginatedAssignments.map((a) => {
                const link = assignmentLink(a, user?.role);
                const group = isGroup(a);
                const groupCount = a.group_count ?? 0;
                const submittedGroups = a.submitted_group_count ?? 0;
                const flaggedGroups = a.flagged_group_count ?? 0;
                const submittedCount = a.submitted_count ?? 0;

                return (
                  <Link
                    key={a.id}
                    to={link}
                    className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs hover:shadow-md hover:border-[#0047FF]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {a.course_code && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                            {a.course_code}
                          </span>
                        )}
                        <TypeBadge group={group} />
                        {a.target_type === 'selected' && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            Selected Cohort
                          </span>
                        )}
                        {a.due_date && (
                          <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Due {new Date(a.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </span>
                        )}
                      </div>

                      <h2 className="font-bold text-base text-[#1A1A1B] group-hover:text-[#0047FF] transition-colors">
                        {a.title}
                      </h2>

                      {/* Progress / Stats Chips */}
                      <div className="flex flex-wrap items-center gap-2">
                        {isLecturer ? (
                          group ? (
                            <>
                              <Chip tone="cobalt">
                                <Users className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                                {groupCount} {groupCount === 1 ? 'group' : 'groups'} · {submittedGroups} submitted
                              </Chip>
                              {flaggedGroups > 0 && (
                                <Chip tone="warn">
                                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                                  {flaggedGroups} {flaggedGroups === 1 ? 'group' : 'groups'} submitted with an incomplete member
                                </Chip>
                              )}
                            </>
                          ) : (
                            <Chip tone="ok">
                              <FileText className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
                              {submittedCount} submitted
                            </Chip>
                          )
                        ) : (
                          <>
                            {group ? (
                              <Chip>Group work</Chip>
                            ) : a.submission_status === 'submitted' ? (
                              <Chip tone="ok">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                Submitted
                              </Chip>
                            ) : a.submission_status === 'draft' ? (
                              <Chip tone="warn">
                                <Clock className="w-3.5 h-3.5 mr-1.5" />
                                Draft
                              </Chip>
                            ) : (
                              <Chip tone="neutral">
                                <Circle className="w-3.5 h-3.5 mr-1.5" />
                                Not started
                              </Chip>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0047FF] flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                      <span>{isLecturer ? 'Review Submissions' : a.submission_status === 'submitted' ? 'View Work' : 'Open Workspace'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </Link>
                );
              })}
            </div>

            <PaginationControls
              currentPage={assignmentPage}
              totalPages={totalAssignmentPages}
              onPageChange={setAssignmentPage}
              label="assignments"
            />
          </div>
        )}
      </section>

      {/* Modals */}
      {showAssignmentForm && (
        <AssignmentForm
          onClose={() => setShowAssignmentForm(false)}
          onRequestCreateCourse={() => {
            setShowAssignmentForm(false);
            setShowCourseForm(true);
          }}
          onCreated={(newAssignment) => {
            setShowAssignmentForm(false);
            setAssignments((prev) => [newAssignment, ...prev]);
          }}
        />
      )}

      {showCourseForm && (
        <CourseForm
          onSave={(newCourse) => {
            setShowCourseForm(false);
            setCourses((prev) => [newCourse, ...prev]);
          }}
          onCancel={() => setShowCourseForm(false)}
        />
      )}

      {showJoinModal && (
        <JoinCourseModal
          onJoined={(newCourse) => {
            setShowJoinModal(false);
            setCourses((prev) => {
              if (prev.some((c) => c.id === newCourse.id)) return prev;
              return [newCourse, ...prev];
            });
            api.get('assignments').then((res) => setAssignments(res.assignments || []));
          }}
          onCancel={() => setShowJoinModal(false)}
        />
      )}

      {deleteTargetCourse && (
        <DeleteCourseModal
          course={deleteTargetCourse}
          onDeleted={(deletedId) => {
            setDeleteTargetCourse(null);
            setCourses((prev) => prev.filter((c) => c.id !== deletedId));
            setAssignments((prev) => prev.filter((a) => a.course_id !== deletedId));
          }}
          onCancel={() => setDeleteTargetCourse(null)}
        />
      )}
    </div>
  );
}