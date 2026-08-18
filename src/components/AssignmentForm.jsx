import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import {
  X,
  Users,
  BookOpen,
  AlertCircle,
  Sparkles,
  CheckSquare,
  Square,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';

export default function AssignmentForm({ initialCourseId, onClose, onCreated, onRequestCreateCourse }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(initialCourseId ? String(initialCourseId) : '');
  const [additionalCourses, setAdditionalCourses] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isGroupWork, setIsGroupWork] = useState(false);
  const [targetType, setTargetType] = useState('all');
  const [courseMembers, setCourseMembers] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState('');

  // Fetch lecturer's courses on mount
  useEffect(() => {
    let mounted = true;
    api.get('courses')
      .then((res) => {
        if (mounted) {
          const list = res.courses || [];
          setCourses(list);
          if (!courseId && list.length > 0) {
            setCourseId(String(list[0].id));
          }
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to load courses');
      })
      .finally(() => {
        if (mounted) setLoadingCourses(false);
      });
    return () => { mounted = false; };
  }, [courseId]);

  // Fetch course members when targetType === 'selected'
  useEffect(() => {
    if (targetType !== 'selected' || !courseId) {
      setCourseMembers([]);
      return;
    }
    let mounted = true;
    setLoadingMembers(true);
    api.get(`courses/${courseId}/members`)
      .then((res) => {
        if (mounted) {
          const students = (res.members || []).filter((m) => m.role === 'student');
          setCourseMembers(students);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Failed to load course students');
      })
      .finally(() => {
        if (mounted) setLoadingMembers(false);
      });
    return () => { mounted = false; };
  }, [courseId, targetType]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!courseId) { setError('Please select a primary course'); return; }

    setLoading(true);
    setError('');

    try {
      const payload = {
        course_id: parseInt(courseId, 10),
        title: title.trim(),
        description: description.trim() || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
        is_group_work: isGroupWork ? 1 : 0,
        target_type: targetType,
        student_ids: targetType === 'selected' ? selectedStudentIds : undefined,
        additional_course_ids: additionalCourses.map((id) => parseInt(id, 10)),
      };

      const res = await api.post('assignments', payload);
      onCreated(res.assignment);
    } catch (err) {
      setError(err.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  }

  function toggleAdditionalCourse(cId) {
    setAdditionalCourses((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  }

  function toggleStudent(sId) {
    setSelectedStudentIds((prev) =>
      prev.includes(sId) ? prev.filter((id) => id !== sId) : [...prev, sId]
    );
  }

  function toggleSelectAllStudents() {
    if (selectedStudentIds.length === courseMembers.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(courseMembers.map((m) => m.user_id));
    }
  }

  // If lecturer has no courses, prompt to create a course first
  if (!loadingCourses && courses.length === 0) {
    const noCoursesContent = (
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 sm:p-7 max-w-md w-full text-center space-y-4 animate-in zoom-in-95 duration-150">
          <div className="w-12 h-12 rounded-xl bg-[#0047FF]/10 text-[#0047FF] mx-auto flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#1A1A1B]">Create a Course First</h3>
            <p className="text-xs text-gray-500 font-sans leading-relaxed">
              Assignments must belong to a course so students can be enrolled. Create your first course to begin.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onRequestCreateCourse}
              className="w-full sm:w-auto px-4 py-2 bg-[#0047FF] hover:bg-[#0038CC] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Create Course
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(noCoursesContent, document.body) : noCoursesContent;
  }

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-assignment-title"
    >
      <div
        className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 bg-[#F9F8F6] border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0047FF]/10 text-[#0047FF] border border-[#0047FF]/20 flex items-center justify-center font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#0047FF] uppercase block">
                CREATE ASSIGNMENT
              </span>
              <h2 id="new-assignment-title" className="font-bold text-base text-[#1A1A1B]">
                New Course Assignment
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close new assignment dialog"
            className="inline-flex items-center justify-center min-h-10 min-w-10 rounded-lg text-gray-400 hover:text-[#1A1A1B] hover:bg-gray-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 text-xs rounded-lg p-3 border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Course Selection */}
          <div>
            <label
              htmlFor="assignment-course"
              className="block text-xs font-bold font-mono uppercase tracking-wider text-gray-700 mb-1.5"
            >
              Course *
            </label>
            {loadingCourses ? (
              <div className="text-xs text-gray-500 py-2">Loading courses...</div>
            ) : (
              <select
                id="assignment-course"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
                className="w-full min-h-10 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-[#1A1A1B] outline-none transition-colors focus:border-[#0047FF] focus:ring-2 focus:ring-[#0047FF]/20 font-medium cursor-pointer"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title} {c.semester ? `(${c.semester})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Multi-Course Assignment Picker */}
          {courses.length > 1 && (
            <div className="p-3 bg-[#F9F8F6] rounded-lg border border-gray-200">
              <span className="block text-xs font-semibold text-gray-700 mb-1.5">
                Also assign to other courses (Optional):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {courses.filter((c) => String(c.id) !== courseId).map((c) => {
                  const isChecked = additionalCourses.includes(c.id);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => toggleAdditionalCourse(c.id)}
                      className={`flex items-center gap-2 p-2 rounded-md text-left text-xs border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-blue-50/80 border-[#0047FF]/40 text-[#0047FF] font-semibold'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-3.5 h-3.5 text-[#0047FF] shrink-0" /> : <Square className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                      <span className="truncate">{c.code} — {c.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="new-assignment-title-input"
              className="block text-xs font-bold font-mono uppercase tracking-wider text-gray-700 mb-1.5"
            >
              Assignment Title *
            </label>
            <input
              id="new-assignment-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Comparative Analysis of Monetary Policy"
              required
              className="w-full min-h-10 rounded-lg border border-gray-300 bg-[#F9F8F6] px-3.5 py-2 text-sm text-[#1A1A1B] placeholder:text-gray-400 outline-none transition-colors focus:border-[#0047FF] focus:bg-white focus:ring-2 focus:ring-[#0047FF]/20 font-sans"
            />
          </div>

          <div>
            <label
              htmlFor="new-assignment-description"
              className="block text-xs font-bold font-mono uppercase tracking-wider text-gray-700 mb-1.5"
            >
              Instructions / Prompt
            </label>
            <textarea
              id="new-assignment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide background context, required sections, or citation requirements..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-[#F9F8F6] p-3 text-sm text-[#1A1A1B] placeholder:text-gray-400 outline-none transition-colors focus:border-[#0047FF] focus:bg-white focus:ring-2 focus:ring-[#0047FF]/20 resize-none font-sans"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="new-assignment-due"
                className="block text-xs font-bold font-mono uppercase tracking-wider text-gray-700 mb-1.5"
              >
                Due Date & Time
              </label>
              <input
                id="new-assignment-due"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-gray-300 bg-[#F9F8F6] px-3 py-2 text-xs text-[#1A1A1B] outline-none transition-colors focus:border-[#0047FF] focus:bg-white focus:ring-2 focus:ring-[#0047FF]/20 font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="new-assignment-target"
                className="block text-xs font-bold font-mono uppercase tracking-wider text-gray-700 mb-1.5"
              >
                Student Recipients
              </label>
              <select
                id="new-assignment-target"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full min-h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-[#1A1A1B] outline-none transition-colors focus:border-[#0047FF] focus:ring-2 focus:ring-[#0047FF]/20 font-medium"
              >
                <option value="all">All students in course (Default)</option>
                <option value="selected">Selected students only</option>
              </select>
            </div>
          </div>

          {/* Selected Students Picker if targetType === 'selected' */}
          {targetType === 'selected' && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <span className="block text-xs font-semibold text-gray-700">
                Select Eligible Students:
              </span>
              {courseMembers.length === 0 ? (
                <p className="text-xs text-gray-500">No students currently enrolled in this course.</p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {courseMembers.map((s) => {
                    const isSelected = selectedStudentIds.includes(s.user_id);
                    return (
                      <label
                        key={s.user_id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-white cursor-pointer text-xs text-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudent(s.user_id)}
                          className="rounded text-[#0047FF] focus:ring-[#0047FF]"
                        />
                        <span className="font-medium">{s.name}</span>
                        <span className="text-gray-400 text-[11px]">({s.email})</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Group Work Toggle Card */}
          <div className="pt-1">
            <label
              htmlFor="groupWork"
              className="flex items-start gap-3 p-3.5 bg-[#F9F8F6] rounded-xl border border-gray-200 cursor-pointer hover:border-[#0047FF]/40 transition-colors"
            >
              <input
                type="checkbox"
                id="groupWork"
                checked={isGroupWork}
                onChange={(e) => setIsGroupWork(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#0047FF] focus:ring-[#0047FF] shrink-0 cursor-pointer"
              />
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-sm font-bold text-[#1A1A1B]">
                  <Users className="w-4 h-4 text-[#0047FF]" />
                  <span>Enable group work</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed font-sans">
                  {isGroupWork
                    ? 'Students will self-organize into groups, collaborate on a shared sectioned document, and submit together.'
                    : 'Each student writes in their own individual workspace from draft to submission.'}
                </p>
              </div>
            </label>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto justify-center min-h-10 px-4 py-2 text-xs font-semibold text-gray-600 hover:text-[#1A1A1B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex items-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !courseId}
              className="w-full sm:w-auto justify-center min-h-10 bg-[#0047FF] text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#0038CC] shadow-md shadow-blue-200 disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
            >
              {loading ? (
                <span>Creating...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create Assignment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}