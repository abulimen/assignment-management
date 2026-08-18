import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import { X, Copy, Sparkles, ArrowRight } from 'lucide-react';

export default function DuplicateAssignmentModal({ assignment, onDuplicated, onCancel }) {
  const [courses, setCourses] = useState([]);
  const [targetCourseId, setTargetCourseId] = useState('');
  const [title, setTitle] = useState(assignment?.title || '');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('courses')
      .then((res) => {
        const otherCourses = (res.courses || []).filter((c) => c.id !== assignment?.course_id);
        setCourses(otherCourses);
        if (otherCourses.length > 0) {
          setTargetCourseId(String(otherCourses[0].id));
        }
      })
      .catch((err) => setError(err.message || 'Failed to load courses'))
      .finally(() => setFetching(false));
  }, [assignment?.course_id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!targetCourseId) {
      setError('Please select a target course');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post(`assignments/${assignment.id}/duplicate`, {
        target_course_id: parseInt(targetCourseId, 10),
        title: title.trim() || undefined,
      });
      onDuplicated(res.assignment);
    } catch (err) {
      setError(err.message || 'Failed to duplicate assignment');
    } finally {
      setLoading(false);
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F9F8F6]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1B]">Assign to Another Course</h2>
              <p className="text-xs text-gray-500">Create an independent copy for another class context</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          {fetching ? (
            <div className="py-6 text-center text-xs text-gray-500">Loading your courses...</div>
          ) : courses.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-xs text-gray-600">
                You don't have any other courses to assign this to.
              </p>
              <p className="text-[11px] text-gray-400">
                Create a second course (e.g. Group B or another section) from your dashboard first.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Target Course *
                </label>
                <select
                  value={targetCourseId}
                  onChange={(e) => setTargetCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/30 focus:border-[#0047FF]"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title} {c.semester ? `(${c.semester})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1.5">
                  An independent assignment will be created in this course with its own separate submissions and deadlines.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Assignment Title in Target Course
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/30 focus:border-[#0047FF]"
                />
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto justify-center px-4 py-2.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || fetching || courses.length === 0}
              className="w-full sm:w-auto justify-center px-5 py-2.5 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <span>Duplicating...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Assign to Course</span>
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
