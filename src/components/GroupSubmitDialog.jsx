import { useState } from 'react';
import { X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { STATUS_LABEL } from '../utils/groupStatus';

// The submit ceremony. Two modes:
//  - normal:   everyone is Done — plain confirmation.
//  - override: someone isn't Done — names each of them, requires a reason.
export default function GroupSubmitDialog({ summary, isOverride, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const valid = !isOverride || reason.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {isOverride
              ? <AlertTriangle className="w-5 h-5 text-amber-500" />
              : <CheckCircle2 className="w-5 h-5 text-green-600" />}
            <h3 className="font-semibold">
              {isOverride ? 'Submit anyway as leader?' : 'Submit group assignment?'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {isOverride ? (
          <>
            <p className="text-sm text-gray-600 mb-3">
              The following members have <strong>not</strong> marked themselves Done. Submitting now
              will record exactly who wasn't finished, and the lecturer will see it.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 space-y-1.5">
              {summary.notDone.map((m) => (
                <div key={m.student_id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-amber-800">{m.student_name}</span>
                  <span className="text-xs text-amber-600">{STATUS_LABEL[m.status] || 'Not Started'}</span>
                </div>
              ))}
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Why are you submitting without them?</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
              placeholder="e.g. Michael hasn't responded for a week and the deadline is tonight"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </>
        ) : (
          <p className="text-sm text-gray-600">
            All {summary.total} members are Done. The document will be sealed — no further edits
            will be possible.
          </p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={busy}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => onConfirm(isOverride ? reason.trim() : null)} disabled={!valid || busy}
            className={`px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 ${isOverride ? 'bg-amber-600 hover:bg-amber-700' : 'bg-primary-600 hover:bg-primary-700'}`}>
            {busy ? 'Submitting...' : isOverride ? 'Submit Anyway as Leader' : 'Submit — Everyone Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}
