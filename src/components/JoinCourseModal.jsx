import { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api';
import { X, KeyRound, ArrowRight } from 'lucide-react';

export default function JoinCourseModal({ onJoined, onCancel }) {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setError('Please enter a course invite code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('courses/join', { invite_code: code });
      onJoined(res.course);
    } catch (err) {
      setError(err.message || 'Failed to join course. Please check the code.');
    } finally {
      setLoading(false);
    }
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F9F8F6]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A1B]">Join a Course</h2>
              <p className="text-xs text-gray-500">Enter the invite code from your lecturer</p>
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

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Course Invite Code
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="e.g. SWE201-8K4P"
              autoFocus
              required
              className="w-full px-3.5 py-2.5 text-base font-mono uppercase tracking-wider text-center bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0047FF]/30 focus:border-[#0047FF]"
            />
            <p className="text-[11px] text-gray-500 mt-2 text-center">
              Invite codes are case-insensitive and provided by your course lecturer.
            </p>
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
              disabled={loading || !inviteCode.trim()}
              className="w-full sm:w-auto justify-center px-5 py-2.5 text-xs font-bold text-white bg-[#0047FF] hover:bg-[#0038CC] rounded-lg shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <span>Enrolling...</span>
              ) : (
                <>
                  <span>Join Course</span>
                  <ArrowRight className="w-3.5 h-3.5" />
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
