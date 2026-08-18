import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import { X, BookOpen, Sparkles } from 'lucide-react';

export default function CourseForm({ course, onSave, onCancel }) {
  const [code, setCode] = useState(course?.code || '');
  const [title, setTitle] = useState(course?.title || '');
  const [semester, setSemester] = useState(course?.semester || '');
  const [description, setDescription] = useState(course?.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(course?.id);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!code.trim()) { setError('Course code is required (e.g. SWE 201)'); return; }
    if (!title.trim()) { setError('Course title is required'); return; }

    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        const res = await api.put(`courses/${course.id}`, {
          code: code.trim().toUpperCase(),
          title: title.trim(),
          semester: semester.trim() || undefined,
          description: description.trim() || undefined,
        });
        onSave(res.course);
      } else {
        const res = await api.post('courses', {
          code: code.trim().toUpperCase(),
          title: title.trim(),
          semester: semester.trim() || undefined,
          description: description.trim() || undefined,
        });
        onSave(res.course);
      }
    } catch (err) {
      setError(err.message || 'Failed to save course');
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
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1B]">
                {isEditing ? 'Edit Course' : 'Create Course'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEditing ? 'Update course details and teaching context' : 'Set up a new course teaching context'}
              </p>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="SWE 201"
                required
                className="w-full px-3 py-2 text-sm font-mono uppercase bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/30 focus:border-[#0047FF]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Course Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Software Engineering II"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/30 focus:border-[#0047FF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Semester / Term <span className="font-normal text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="e.g. 1st Semester or 1st Term"
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/30 focus:border-[#0047FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description <span className="font-normal text-gray-400">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Brief course summary or instructions for students..."
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/30 focus:border-[#0047FF] resize-none"
            />
          </div>

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
              disabled={loading}
              className="w-full sm:w-auto justify-center px-5 py-2.5 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Save Changes' : 'Create Course'}</span>
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
