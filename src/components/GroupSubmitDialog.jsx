import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { STATUS_LABEL } from '../utils/groupStatus';

// The submit ceremony. Two modes:
//  - normal:   everyone is Done — plain confirmation.
//  - override: someone isn't Done — names each of them, requires a reason.
export default function GroupSubmitDialog({ summary, isOverride, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const valid = !isOverride || reason.trim().length > 0;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-submit-title"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 sm:p-7 border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                isOverride
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isOverride ? <AlertTriangle className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold">
                SUBMISSION CEREMONY
              </span>
              <h2 id="group-submit-title" className="text-base font-bold text-[#1A1A1B]">
                {isOverride ? 'Submit anyway as leader?' : 'Submit group assignment?'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close submit dialog"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isOverride ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              The following members have <strong className="text-amber-800">not</strong> marked themselves Done. Submitting now will record exactly who was not finished in the permanent institutional record.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1.5">
              {summary.notDone.map((m) => (
                <div key={m.student_id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-amber-900 min-w-0 truncate">{m.student_name}</span>
                  <span className="font-mono text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded shrink-0">
                    {STATUS_LABEL[m.status] || 'Not Started'}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <label htmlFor="group-submit-reason" className="block text-xs font-bold text-gray-700 mb-1 font-mono">
                Mandatory Reason for Override
              </label>
              <textarea
                id="group-submit-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. Deadline reached; remaining sections completed by team."
                className="w-full rounded-lg border border-gray-300 bg-[#F9F8F6] p-3 text-xs text-[#1A1A1B] placeholder:text-gray-400 outline-none transition-colors focus:border-[#0047FF] focus:bg-white focus:ring-2 focus:ring-[#0047FF]/20"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-600 leading-relaxed font-sans">
              All <strong className="text-[#1A1A1B]">{summary.total} members</strong> have marked their sections Done.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed font-sans">
              Submitting seals the shared document. No further edits will be permitted once sealed.
            </p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2.5 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(isOverride ? reason.trim() : null)}
            disabled={!valid || busy}
            className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-all disabled:opacity-50 cursor-pointer ${
              isOverride
                ? 'bg-amber-700 hover:bg-amber-800'
                : 'bg-[#0047FF] hover:bg-[#0038CC] shadow-blue-200'
            }`}
          >
            {busy ? 'Submitting...' : isOverride ? 'Submit Anyway as Leader' : 'Submit — Everyone Complete'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
